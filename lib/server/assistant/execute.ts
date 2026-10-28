import { Prisma, type PrismaClient } from "@prisma/client";

import { authorizeAssistant } from "./authorize";
import { createActionCatalog } from "./catalog";
import { type EffectHandlers, runDurableEffects } from "./effects";
import { createIntent, intentOwner, intentSummary, requestDigest } from "./intent-store";
import { confirmationFor } from "./policy";
import { identifyActionRequest } from "./prepare";
import { readReceipt } from "./receipts";
import type { ActionExecutionContext, ActionRequest, AssistantCaller, DispatchResult, DurableEffect, ExecutionMode, ReceiptDto } from "./types";

import "server-only";
import { isApiTokenScope } from "@/lib/constants/ai";
import { prisma } from "@/lib/db";
import { actionPreviewSchema, actionResultSchema, executionModeSchema, receiptEffectsSchema } from "@/lib/schemas/assistant";
import { ContentError, parseInput } from "@/lib/server/content/errors";
import { runContentWriteContext } from "@/lib/server/content/write-context";
import type { Actor } from "@/lib/utils/api/actor";

type Catalog = ReturnType<typeof createActionCatalog>;
type Options = { db?: PrismaClient; catalog?: Catalog; now?: () => Date; effects?: EffectHandlers };

const forbidden = () => new ContentError("Дія недоступна", 403);

const conflict = () => new ContentError("Пропозиція вже неактуальна або завершена", 409);

export function createAssistantExecutor(options: Options = {}) {
  const db = options.db ?? prisma;

  const catalog = options.catalog ?? createActionCatalog([]);

  const now = options.now ?? (() => new Date());

  async function modeFor(caller: AssistantCaller, client: Pick<Prisma.TransactionClient, "apiToken" | "aiThread"> = db): Promise<ExecutionMode> {
    if (caller.actor.via === "token") {
      const row = await client.apiToken.findUnique({ where: { id: caller.tokenId ?? "" }, select: { executionMode: true } });

      if (!row) throw forbidden();

      return parseInput(executionModeSchema, row.executionMode);
    }

    if (!caller.threadId) return "review";

    const row = await client.aiThread.findFirst({ where: { id: caller.threadId, campaignId: caller.actor.campaignId, userId: caller.actor.userId }, select: { executionMode: true } });

    if (!row) throw forbidden();

    return parseInput(executionModeSchema, row.executionMode);
  }

  async function executeIntent(caller: AssistantCaller, intentId: string, human: boolean, signal?: AbortSignal): Promise<ReceiptDto> {
    const callbacks: Array<() => void> = [];

    const outcome = await db.$transaction(async (tx) => {
      const where = { id: intentId, ...intentOwner(caller) };

      const owned = await tx.assistantIntent.findFirst({ where });

      const previous = await tx.assistantReceipt.findFirst({ where: { intentId, ...intentOwner(caller) } });

      if (!owned && !previous) throw new ContentError("Пропозицію не знайдено", 404);

      if (!owned && previous) {
        await authorizeAssistant(caller, catalog.getAction(previous.actionId).need, "prepare", tx);

        return { receipt: previous };
      }

      await tx.$queryRaw`SELECT id FROM campaigns WHERE id = ${caller.actor.campaignId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM assistant_intents WHERE id = ${intentId} FOR UPDATE`;

      const row = await tx.assistantIntent.findFirst({ where });

      if (!row) throw conflict();

      const done = await tx.assistantReceipt.findFirst({ where: { intentId, ...intentOwner(caller) } });

      if (done) {
        await authorizeAssistant(caller, catalog.getAction(done.actionId).need, "prepare", tx);

        return { receipt: done };
      }

      if (row.status !== "pending" || row.redactedAt) throw conflict();

      if (row.expiresAt <= now()) {
        await tx.assistantIntent.update({ where: { id: row.id }, data: { status: "expired" } });

        return { error: conflict() };
      }

      const action = catalog.getAction(row.actionId);

      if (action.effect !== "write") throw new ContentError("Ця дія потребує іншого способу виконання", 409);

      await tx.$queryRaw`SELECT id FROM campaign_members WHERE "campaignId" = ${row.campaignId} AND "userId" = ${caller.actor.userId} FOR SHARE`;
      await authorizeAssistant(caller, action.need, "execute", tx);

      if (row.originTokenId) {
        await tx.$queryRaw`SELECT id FROM api_tokens WHERE id = ${row.originTokenId} FOR SHARE`;

        const original = await tx.apiToken.findUnique({ where: { id: row.originTokenId }, select: { id: true, scopes: true, campaignId: true, userId: true, revokedAt: true } });

        if (!original || original.revokedAt || original.userId !== row.userId || original.campaignId !== row.campaignId) throw forbidden();

        await authorizeAssistant({ actor: { ...caller.actor, via: "token", scopes: original.scopes.filter(isApiTokenScope) }, channel: "mcp", tokenId: row.originTokenId, threadId: null }, action.need, "prepare", tx);
      }

      // All content writes in this scope reuse the same transaction/connection.
      return runContentWriteContext(row.campaignId, tx, async () => {
        signal?.throwIfAborted();

        const input = parseInput(action.input, row.payload);

        const prepared = await action.prepare(caller, input).catch((error: unknown) => {
          if (error instanceof ContentError && (error.status === 404 || error.status === 409)) return null;

          throw error;
        });

        const fresh = prepared === null ? null : parseInput(actionPreviewSchema, prepared);

        if (!fresh || requestDigest(fresh.preconditions) !== requestDigest(row.expected)) {
          await tx.assistantIntent.update({ where: { id: row.id }, data: { status: "stale" } });

          if (row.legacyProposalId) await tx.aiProposal.updateMany({ where: { id: row.legacyProposalId, campaignId: row.campaignId, status: "pending" }, data: { status: "stale" } });

          return { error: conflict() };
        }

        const policyCaller = row.channel === "chat" ? { ...caller, threadId: row.originThreadId } : caller;

        if (!human && confirmationFor(action, await modeFor(policyCaller, tx), fresh) === "human") throw conflict();

        const effects: DurableEffect[] = [];

        const ctx: ActionExecutionContext = { caller, intentId: row.id, expected: row.expected, db: tx, afterCommit: (effect) => { effects.push(effect); } };

        const result = parseInput(actionResultSchema, await action.execute(ctx, input));

        const receipt = await tx.assistantReceipt.create({ data: {
          intentId: row.id, campaignId: row.campaignId, userId: row.userId, originTokenId: row.originTokenId,
          originKey: row.originKey, requestId: row.requestId, requestHash: row.requestHash, actionId: row.actionId,
          status: "applied", result: result as Prisma.InputJsonValue, effects: { items: effects, completed: [] } as unknown as Prisma.InputJsonValue, effectsStatus: effects.length ? "pending" : "complete",
        } });

        // Campaign deletion may already have cascaded the intent away.
        if (await tx.assistantIntent.findFirst({ where: { id: row.id } })) await tx.assistantIntent.update({ where: { id: row.id }, data: { status: "applied" } });

        return { receipt, effects };
      }, callbacks);
    }, { timeout: 30_000, maxWait: 5_000 });

    if ("error" in outcome && outcome.error) throw outcome.error;

    let callbacksFailed = false;

    for (const callback of callbacks) { try { await callback(); } catch { callbacksFailed = true; } }

    if ("effects" in outcome && outcome.effects?.length && outcome.receipt) {
      const effects = await runDurableEffects(outcome.effects, options.effects ?? {}, []);

      await db.assistantReceipt.update({ where: { intentId }, data: { effectsStatus: effects.status, effects: { items: outcome.effects, completed: effects.completed } as unknown as Prisma.InputJsonValue } });
    }

    if (callbacksFailed) await db.assistantReceipt.update({ where: { intentId }, data: { effectsStatus: "unknown" } });

    return readReceipt(caller, intentId, db);
  }

  async function dispatchAction(caller: AssistantCaller, raw: ActionRequest, signal?: AbortSignal): Promise<DispatchResult> {
    signal?.throwIfAborted();

    const action = catalog.getAction(raw.actionId);

    await authorizeAssistant(caller, action.need, "prepare", db);

    const input = parseInput(action.input, raw.input);

    if (action.effect === "read") return { kind: "result", result: parseInput(actionResultSchema, await action.execute(caller, input)) };

    if (action.effect === "handoff") return { kind: "handoff", ...await action.execute(caller, input) };

    if (action.effect === "paid") throw new ContentError("Платний адаптер ще недоступний", 409);

    const { request, originKey, requestHash } = identifyActionRequest(caller, { ...raw, input });

    const prior = await db.assistantReceipt.findFirst({ where: { ...intentOwner(caller), originKey, requestId: request.requestId } });

    if (prior) {
      if (prior.requestHash !== requestHash) throw conflict();

      if (prior.status !== "applied" || prior.result === null) throw conflict();

      return { kind: "result", result: parseInput(actionResultSchema, prior.result) };
    }

    const preview = parseInput(actionPreviewSchema, await action.prepare(caller, input));

    const intent = await createIntent(caller, request, preview, { db, now: now() });

    if (confirmationFor(action, await modeFor(caller), preview) === "none") {
      const receipt = await executeIntent(caller, intent.id, false, signal);

      if (!receipt.result) throw conflict();

      return { kind: "result", result: receipt.result };
    }

    return { kind: "pending", intent, reviewUrl: `/campaigns/${caller.actor.campaignId}/dm/assistant?intent=${intent.id}` };
  }

  async function confirmIntent(actor: Actor, id: string): Promise<ReceiptDto> {
    if (actor.via !== "session" || actor.scopes !== null || !actor.isDM) throw forbidden();

    return executeIntent({ actor, channel: "chat", threadId: null, tokenId: null }, id, true);
  }

  async function rejectIntent(caller: AssistantCaller, id: string) {
    const callbacks: Array<() => void> = [];

    const result = await db.$transaction(async (tx) => {
      const row = await tx.assistantIntent.findFirst({ where: { id, ...intentOwner(caller) } });

      if (!row) throw new ContentError("Пропозицію не знайдено", 404);

      await authorizeAssistant(caller, catalog.getAction(row.actionId).need, "prepare", tx);
      await tx.$queryRaw`SELECT id FROM campaigns WHERE id = ${caller.actor.campaignId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM assistant_intents WHERE id = ${id} FOR UPDATE`;

      const fresh = await tx.assistantIntent.findFirst({ where: { id, ...intentOwner(caller) } });

      if (!fresh || !["pending", "stale", "expired"].includes(fresh.status)) throw conflict();

      const legacyProposalId = fresh.legacyProposalId;

      if (legacyProposalId) {
        const { rejectProposal } = await import("@/lib/ai/proposals");

        await runContentWriteContext(caller.actor.campaignId, tx, () => rejectProposal(caller.actor.campaignId, legacyProposalId), callbacks);
      }

      return intentSummary(await tx.assistantIntent.update({ where: { id }, data: { status: "rejected" } }));
    });

    for (const callback of callbacks) await callback();

    return result;
  }

  async function reconcileEffects(caller: AssistantCaller, intentId: string): Promise<ReceiptDto> {
    const row = await db.assistantReceipt.findFirst({ where: { intentId, ...intentOwner(caller) } });

    if (!row) throw new ContentError("Результат дії не знайдено", 404);

    await authorizeAssistant(caller, catalog.getAction(row.actionId).need, "prepare", db);

    if (row.status !== "applied" || row.effectsStatus === "complete" || row.effectsStatus === "unknown") return readReceipt(caller, intentId, db);

    const stored = parseInput(receiptEffectsSchema, row.effects);

    const effects = await runDurableEffects(stored.items, options.effects ?? {}, stored.completed);

    await db.assistantReceipt.update({ where: { intentId }, data: { effectsStatus: effects.status, effects: { items: stored.items, completed: effects.completed } } });

    return readReceipt(caller, intentId, db);
  }

  return { dispatchAction, confirmIntent, rejectIntent, reconcileEffects };
}

const executor = createAssistantExecutor();

export const dispatchAction = executor.dispatchAction;
export const confirmIntent = executor.confirmIntent;
export const rejectIntent = executor.rejectIntent;
