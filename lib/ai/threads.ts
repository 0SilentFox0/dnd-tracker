import type { Prisma } from "@prisma/client";

import "server-only";
import { AI_LIMITS, type AiProvider, type AiThreadMode, DEFAULT_THREAD_TITLE, defaultModelFor, isKnownModel } from "@/lib/constants/ai";
import { prisma } from "@/lib/db";
import type { AiChatMessage, AiMessageMetadata, AiThread, AiUsage } from "@/types/ai";

const SELECT = { id: true, mode: true, scenarioPageId: true, title: true, provider: true, model: true, executionMode: true, updatedAt: true } as const;

type Row = Prisma.AiThreadGetPayload<{ select: typeof SELECT }>;

const ZERO: AiUsage = { inputTokens: 0, outputTokens: 0 };

const toThread = (r: Row, usage: AiUsage = ZERO): AiThread => ({ ...r, mode: r.mode as AiThreadMode, provider: r.provider as AiProvider, updatedAt: r.updatedAt.toISOString(), usage, executionMode: r.executionMode === "auto" ? "auto" : "review" });

export async function listThreads(campaignId: string, userId: string, pageId?: string): Promise<AiThread[]> {
  const rows = await prisma.aiThread.findMany({ where: { campaignId, userId, ...(pageId && { scenarioPageId: pageId }) }, select: SELECT, orderBy: { updatedAt: "desc" }, take: 30 });

  if (!rows.length) return [];

  const usage = await usageByThread(rows.map((r) => r.id));

  return rows.map((r) => toThread(r, usage.get(r.id)));
}

export async function resolveDefaultModel(userId: string, provider: AiProvider, mode: AiThreadMode): Promise<string> {
  const cred = await prisma.aiCredential.findUnique({ where: { userId_provider: { userId, provider } }, select: { defaultModel: true } });

  return cred?.defaultModel && isKnownModel(provider, cred.defaultModel) ? cred.defaultModel : defaultModelFor(provider, mode);
}

export async function createThread(campaignId: string, userId: string, input: { mode: AiThreadMode; scenarioPageId?: string | null; provider: AiProvider; model?: string }): Promise<AiThread> {
  const model = input.model ?? (await resolveDefaultModel(userId, input.provider, input.mode));

  const row = await prisma.aiThread.create({ data: { campaignId, userId, mode: input.mode, scenarioPageId: input.scenarioPageId ?? null, provider: input.provider, model, title: DEFAULT_THREAD_TITLE }, select: SELECT });

  return toThread(row);
}

export async function loadThread(campaignId: string, userId: string, threadId: string): Promise<AiThread | null> {
  const row = await prisma.aiThread.findFirst({ where: { id: threadId, campaignId, userId }, select: SELECT });

  return row ? toThread(row, (await usageByThread([threadId])).get(threadId) ?? ZERO) : null;
}

export async function patchThread(campaignId: string, userId: string, threadId: string, data: { title?: string; provider?: AiProvider; model?: string }): Promise<AiThread | null> {
  const { count } = await prisma.aiThread.updateMany({ where: { id: threadId, campaignId, userId }, data });

  return count ? loadThread(campaignId, userId, threadId) : null;
}

export async function deleteThread(campaignId: string, userId: string, threadId: string): Promise<boolean> {
  return (await prisma.aiThread.deleteMany({ where: { id: threadId, campaignId, userId } })).count > 0;
}

export async function loadMessages(threadId: string, limit: number = AI_LIMITS.historyMessages): Promise<AiChatMessage[]> {
  const rows = await prisma.aiMessage.findMany({ where: { threadId }, orderBy: { seq: "desc" }, take: limit, select: { id: true, role: true, parts: true, metadata: true } });

  return rows.reverse().map((r) => ({ id: r.id, role: r.role as "user" | "assistant", parts: r.parts as unknown[], metadata: r.metadata as AiMessageMetadata }));
}

const textOf = (parts: unknown[]) => parts.map((p) => (p && typeof p === "object" && (p as { type?: string }).type === "text" ? String((p as { text?: string }).text ?? "") : "")).join(" ").trim();

export async function appendMessage(threadId: string, message: { id?: string; role: "user" | "assistant"; parts: unknown[]; metadata?: AiMessageMetadata }): Promise<void> {
  await prisma.$transaction(tx => appendMessageInTransaction(tx, threadId, message));
}

export async function appendMessageInTransaction(tx: Prisma.TransactionClient, threadId: string, message: { id?: string; role: "user" | "assistant"; parts: unknown[]; metadata?: AiMessageMetadata }): Promise<void> {
    await tx.$queryRaw`SELECT id FROM ai_threads WHERE id = ${threadId} FOR UPDATE`;

    if (message.id && await tx.aiMessage.findFirst({ where: { id: message.id, threadId }, select: { id: true } })) return;

    const last = await tx.aiMessage.findFirst({ where: { threadId }, orderBy: { seq: "desc" }, select: { seq: true } });

    await tx.aiMessage.create({ data: { ...(message.id && { id: message.id }), threadId, seq: (last?.seq ?? 0) + 1, role: message.role, parts: message.parts as Prisma.InputJsonValue, metadata: (message.metadata ?? {}) as Prisma.InputJsonValue } });

    const title = !last && message.role === "user" ? textOf(message.parts).slice(0, 60) : undefined;

    await tx.aiThread.update({ where: { id: threadId }, data: { updatedAt: new Date(), ...(title && { title }) } });
}

async function usageByThread(threadIds: string[]): Promise<Map<string, AiUsage>> {
  const [rows, runs] = await Promise.all([
    prisma.aiMessage.findMany({ where: { threadId: { in: threadIds }, role: "assistant" }, select: { id: true, threadId: true, metadata: true } }),
    prisma.assistantRun.findMany({ where: { threadId: { in: threadIds } }, select: { id: true, threadId: true, resultRefs: true } }),
  ]);

  const totals = new Map<string, AiUsage>();

  const add = (threadId: string, usage?: AiUsage) => {
    const u = usage ?? { inputTokens: null, outputTokens: null, partial: true };

    const acc = totals.get(threadId) ?? ZERO;

    totals.set(threadId, { inputTokens: acc.inputTokens === null || u.inputTokens === null ? null : acc.inputTokens + u.inputTokens, outputTokens: acc.outputTokens === null || u.outputTokens === null ? null : acc.outputTokens + u.outputTokens, ...((acc.partial || u.partial) && { partial: true }) });
  };

  for (const r of rows) add(r.threadId, (r.metadata as AiMessageMetadata | null)?.usage);

  const saved = new Set(rows.map(r => r.id));

  for (const run of runs) {
    if (saved.has(`assistant-${run.id}`)) continue;

    const refs = run.resultRefs as { usage?: AiUsage } | null;

    add(run.threadId, refs?.usage);
  }

  return totals;
}
