import type { Prisma, PrismaClient } from "@prisma/client";

import { revalidateAssistantCaller } from "./authorize";
import { createAssistantExecutor } from "./execute";
import { intentOwner, intentSummary } from "./intent-store";
import type { AssistantCaller } from "./types";

import "server-only";
import { appendMessageInTransaction } from "@/lib/ai/threads";
import { AI_LIMITS } from "@/lib/constants/ai";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { RUN_GRACE_MS } from "@/lib/constants/assistant";
import { prisma } from "@/lib/db";
import { assistantRequestIdSchema } from "@/lib/schemas/ai";
import { actionResultSchema } from "@/lib/schemas/assistant";
import { lockCampaignRow } from "@/lib/server/campaigns/lock";
import { ContentError } from "@/lib/server/content/errors";
import { requestDigest } from "@/lib/utils/battle/store/stable-json";
import { publicToolData } from "@/lib/utils/common/public-tool-data";
import type { AiFocus, AiUsage } from "@/types/ai";

export { RUN_GRACE_MS } from "@/lib/constants/assistant";

function terminalStatus(refs: Prisma.JsonValue): "complete" | "failed" | "aborted" | null {
  if (!refs || typeof refs !== "object" || Array.isArray(refs)) return null;

  if (refs.status === "completed") return "complete";

  if (refs.status === "cancelled") return "aborted";

  return refs.status === "failed" ? "failed" : null;
}

function publicRunStatus(status: string, refs: Prisma.JsonValue) {
  const terminal = terminalStatus(refs);

  return terminal === "complete" ? "completed" : terminal === "aborted" ? "cancelled" : terminal ?? status;
}

type RunInput = { text: string; focus?: AiFocus; sessionContext?: { sourceNoteKeys: string[] } };
type RunResult = { status: "completed" | "cancelled" | "failed"; usage?: AiUsage; errorCode?: string };
export type RunClaim = { replayed: boolean; run: { id: string; requestId: string; status: string; expiresAt: Date; abortRequested: boolean } };

export function createAssistantRunStore(options: { db?: PrismaClient; now?: () => Date } = {}) {
  const db = options.db ?? prisma;

  const now = options.now ?? (() => new Date());

  async function own(caller: AssistantCaller, tx: Prisma.TransactionClient = db) {
    if (!caller.threadId || caller.actor.via !== "session") throw new ContentError(API_ERRORS.ASSISTANT_THREAD_UNAVAILABLE, 403);

    await revalidateAssistantCaller(caller, tx);

    const thread = await tx.aiThread.findFirst({ where: { id: caller.threadId, ...intentOwner(caller) }, select: { id: true } });

    if (!thread) throw new ContentError(API_ERRORS.AI_THREAD_NOT_FOUND, 404);

    return thread.id;
  }

  async function beginAssistantRun(caller: AssistantCaller, requestId: string, input?: RunInput): Promise<RunClaim> {
    if (!assistantRequestIdSchema.safeParse(requestId).success) throw new ContentError(API_ERRORS.INVALID_REQUEST_ID, 400);

    // Recovery may settle effects, but must never retry a business write or external charge.
    const threadId = await own(caller);

    const active = await db.assistantRun.findFirst({ where: { activeThreadId: caller.threadId } });

    if (active && active.expiresAt <= now()) {
      const receipts = await db.assistantReceipt.findMany({ where: { ...intentOwner(caller), requestId: { startsWith: `${active.id}_` } } });

      const executor = createAssistantExecutor({ db });

      for (const receipt of receipts) if (receipt.effectsStatus !== "complete") await executor.reconcileEffects(caller, receipt.intentId);
    }

    return db.$transaction(async tx => {
      await own(caller, tx);
      await lockCampaignRow(tx, caller.actor.campaignId);
      await tx.$queryRaw`SELECT id FROM ai_threads WHERE id = ${caller.threadId} FOR UPDATE`;

      const existing = await tx.assistantRun.findUnique({ where: { threadId_requestId: { threadId: threadId, requestId } } });

      const requestHash = requestDigest(input ?? {});

      if (existing) {
        if (existing.requestHash !== requestHash) throw new ContentError(API_ERRORS.ASSISTANT_REQUEST_ID_CONTENT_MISMATCH, 409);

        return { replayed: true, run: existing };
      }

      const claimed = await tx.assistantRun.findFirst({ where: { activeThreadId: caller.threadId } });

      if (claimed) {
        if (claimed.expiresAt > now()) throw new ContentError(API_ERRORS.ASSISTANT_THREAD_BUSY, 409);

        const unsettled = await tx.assistantIntent.findMany({ where: { ...intentOwner(caller), requestId: { startsWith: `${claimed.id}_` }, status: { in: ["executing", "unknown"] } }, select: { id: true } });

        const uncertain = await tx.assistantReceipt.findMany({ where: { ...intentOwner(caller), requestId: { startsWith: `${claimed.id}_` }, OR: [{ status: { in: ["executing", "unknown"] } }, { effectsStatus: "unknown" }] }, select: { id: true } });

        if (unsettled.length || uncertain.length) throw new ContentError(API_ERRORS.ASSISTANT_PREVIOUS_RESULT_PENDING, 409);

        await tx.assistantRun.update({ where: { id: claimed.id }, data: { activeThreadId: null, ...(claimed.status === "running" && { status: terminalStatus(claimed.resultRefs) ?? "failed", errorCode: claimed.errorCode ?? "INTERRUPTED" }) } });
      }

      const run = await tx.assistantRun.create({ data: { threadId: threadId, requestId, requestHash, activeThreadId: caller.threadId, expiresAt: new Date(now().getTime() + AI_LIMITS.requestDeadlineMs + RUN_GRACE_MS), resultRefs: { usage: { inputTokens: null, outputTokens: null, partial: true } } } });

      if (input) await appendMessageInTransaction(tx, threadId, { id: `user-${run.id}`, role: "user", parts: [{ type: "text", text: input.text }] });

      return { replayed: false, run };
    });
  }

  async function recordAssistantRunUsage(runId: string, usage: AiUsage): Promise<void> {
    await db.assistantRun.updateMany({ where: { id: runId, status: "running" }, data: { resultRefs: { usage: { ...usage, partial: true } } } });
  }

  async function finishAssistantRun(runId: string, result: RunResult): Promise<void> {
    // Retain active lease until deadline + grace even if the provider ignores abort.
    // requestId mapping is retained with receipts (no eager terminal-run deletion).
    await db.assistantRun.updateMany({ where: { id: runId, status: "running" }, data: { errorCode: result.errorCode ?? null, resultRefs: { status: result.status, usage: { ...(result.usage ?? { inputTokens: null, outputTokens: null, partial: true }) } } as Prisma.InputJsonValue } });
  }

  async function readAssistantRuns(caller: AssistantCaller, requestId?: string) {
    if (requestId !== undefined && !assistantRequestIdSchema.safeParse(requestId).success) throw new ContentError(API_ERRORS.INVALID_REQUEST_ID, 400);

    const threadId = await own(caller);

    const rows = await db.assistantRun.findMany({ where: { threadId: threadId, ...(requestId && { requestId }) }, orderBy: { createdAt: "desc" }, take: 30, select: { id: true, requestId: true, status: true, expiresAt: true, abortRequested: true, resultRefs: true } });

    if (!rows.length) return { runs: [], receipts: [], intents: [] };

    const receipts = await db.assistantReceipt.findMany({ where: { ...intentOwner(caller), OR: rows.map(r => ({ requestId: { startsWith: `${r.id}_` } })) }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, intentId: true, status: true, effectsStatus: true, result: true } });

    const intents = await db.assistantIntent.findMany({ where: { ...intentOwner(caller), OR: rows.map(r => ({ requestId: { startsWith: `${r.id}_` } })), status: { in: ["pending", "executing", "unknown"] } }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, actionId: true, status: true, summary: true, targets: true, expiresAt: true, channel: true, createdAt: true, legacyProposalId: true } });

    return {
      intents: intents.map(intentSummary),
      runs: rows.map(r => ({ requestId: r.requestId, status: r.status === "running" && !terminalStatus(r.resultRefs) && r.expiresAt <= now() ? "interrupted" : publicRunStatus(r.status, r.resultRefs), abortRequested: r.abortRequested, expiresAt: r.expiresAt.toISOString() })),
      receipts: receipts.map(r => ({ id: r.id, intentId: r.intentId, status: r.status, effectsStatus: r.effectsStatus, result: actionResultSchema.safeParse(r.result).success ? publicToolData(actionResultSchema.parse(r.result)) : null })),
    };
  }

  async function cancelAssistantRun(caller: AssistantCaller, requestId: string) {
    const threadId = await own(caller);

    await db.assistantRun.updateMany({ where: { threadId: threadId, requestId, status: "running" }, data: { abortRequested: true } });

    return readAssistantRuns(caller);
  }

  return { beginAssistantRun, recordAssistantRunUsage, finishAssistantRun, readAssistantRuns, cancelAssistantRun };
}

const store = createAssistantRunStore();

export const { beginAssistantRun, recordAssistantRunUsage, finishAssistantRun, readAssistantRuns, cancelAssistantRun } = store;

export async function isAssistantRunCancelled(runId: string): Promise<boolean> {
  const run = await prisma.assistantRun.findUnique({ where: { id: runId }, select: { abortRequested: true } });

  return !run || run.abortRequested;
}
