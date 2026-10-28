import { type AssistantIntent,Prisma } from "@prisma/client";
import { createHash } from "node:crypto";

import type { ActionPreview, ActionRequest, AssistantCaller, IntentDetail, IntentStatus,IntentSummary } from "./types";

import "server-only";
import { ASSISTANT_LIMITS } from "@/lib/constants/assistant";
import { prisma } from "@/lib/db";
import { actionPreviewSchema, assistantRequestSchema, assistantTargetSchema, intentPageSchema, intentStatusSchema } from "@/lib/schemas/assistant";
import { ContentError, parseInput } from "@/lib/server/content/errors";
import { stableStringify } from "@/lib/utils/battle/store/stable-json";
import type { IntentPage } from "@/types/assistant";

type IntentDb = Pick<Prisma.TransactionClient, "assistantIntent">;
type StoreOptions = { db?: IntentDb; now?: Date };

const SUMMARY_SELECT = { id: true, actionId: true, status: true, summary: true, targets: true, expiresAt: true, channel: true, createdAt: true, legacyProposalId: true } as const;

type SummaryRow = Pick<AssistantIntent, keyof typeof SUMMARY_SELECT>;

export const requestDigest = (value: unknown): string => createHash("sha256").update(stableStringify(value)).digest("hex");
export const jsonInput = (value: Prisma.JsonValue): Prisma.InputJsonValue | typeof Prisma.JsonNull => value === null ? Prisma.JsonNull : value as Prisma.InputJsonValue;

export function intentOwner(caller: AssistantCaller): { campaignId: string; userId: string; originTokenId?: string } {
  const { actor } = caller;

  if (!actor.isDM || !actor.campaignId || !actor.userId) throw new ContentError("Дія недоступна", 403);

  if (actor.via === "token") {
    if (!caller.tokenId || caller.channel !== "mcp" || !actor.scopes) throw new ContentError("Дія недоступна", 403);

    return { campaignId: actor.campaignId, userId: actor.userId, originTokenId: caller.tokenId };
  }

  if (actor.via !== "session" || caller.channel !== "chat" || caller.tokenId !== null || actor.scopes !== null) throw new ContentError("Дія недоступна", 403);

  return { campaignId: actor.campaignId, userId: actor.userId };
}

export function intentSummary(row: SummaryRow): IntentSummary {

  return { ...(row.legacyProposalId && { legacyProposalId: row.legacyProposalId }), id: row.id, actionId: row.actionId, status: parseInput(intentStatusSchema, row.status), summary: row.summary, targets: parseInput(assistantTargetSchema.array(), row.targets), expiresAt: row.expiresAt.toISOString(), channel: row.channel === "mcp" ? "mcp" : "chat" };
}

export async function createIntent(caller: AssistantCaller, rawRequest: ActionRequest, preview: ActionPreview, options: StoreOptions = {}): Promise<IntentSummary> {
  const owner = intentOwner(caller);

  const request = parseInput(assistantRequestSchema, rawRequest);

  const validatedPreview = parseInput(actionPreviewSchema, preview);

  if (Buffer.byteLength(JSON.stringify({ request, preview: validatedPreview })) > ASSISTANT_LIMITS.maxPayloadBytes) throw new ContentError("Завелика пропозиція змін", 413);

  const originKey = requestDigest({ campaignId: owner.campaignId, channel: caller.channel, threadId: caller.threadId, tokenId: caller.tokenId });

  const requestHash = requestDigest({ actionId: request.actionId, input: request.input });

  const now = options.now ?? new Date();

  const row = await (options.db ?? prisma).assistantIntent.upsert({
    where: { userId_originKey_requestId: { userId: owner.userId, originKey, requestId: request.requestId } },
    create: {
      campaignId: owner.campaignId, userId: owner.userId, channel: caller.channel,
      threadId: caller.threadId, tokenId: caller.tokenId, originThreadId: caller.threadId, originTokenId: caller.tokenId,
      originKey, requestId: request.requestId, requestHash, actionId: request.actionId,
      summary: validatedPreview.summary, targets: validatedPreview.targets,
      payload: jsonInput(request.input), preview: validatedPreview as Prisma.InputJsonValue, expected: jsonInput(validatedPreview.preconditions),
      status: "pending", expiresAt: new Date(now.getTime() + ASSISTANT_LIMITS.intentTtlMs),
    },
    update: {},
    select: { ...SUMMARY_SELECT, requestHash: true },
  });

  if (row.requestHash !== requestHash) throw new ContentError("Цей запит уже має інший вміст", 409);

  return intentSummary(row);
}

export async function getIntent(caller: AssistantCaller, id: string, db: IntentDb = prisma): Promise<IntentDetail> {
  const row = await db.assistantIntent.findFirst({ where: { id, ...intentOwner(caller) }, select: { ...SUMMARY_SELECT, preview: true, redactedAt: true } });

  if (!row) throw new ContentError("Пропозицію не знайдено", 404);

  if (row.redactedAt || row.preview === null) throw new ContentError("Вміст пропозиції очищено", 410);

  return { ...intentSummary(row), preview: parseInput(actionPreviewSchema, row.preview) };
}

export async function listIntents(caller: AssistantCaller, input: { cursor?: string; limit?: number; status?: IntentStatus } = {}, db: IntentDb = prisma): Promise<IntentPage> {
  const { cursor, limit, status } = parseInput(intentPageSchema, input);

  let after: { createdAt: string; id: string } | undefined;

  if (cursor) {
    try {
      const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));

      if (typeof parsed.createdAt !== "string" || !Number.isFinite(Date.parse(parsed.createdAt)) || typeof parsed.id !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(parsed.id)) throw new Error();

      after = parsed;
    } catch { throw new ContentError("Некоректний курсор списку", 400); }
  }

  const rows = await db.assistantIntent.findMany({
    where: { ...intentOwner(caller), ...(status && { status }), ...(after && { OR: [{ createdAt: { lt: new Date(after.createdAt) } }, { createdAt: new Date(after.createdAt), id: { lt: after.id } }] }) },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: limit + 1, select: SUMMARY_SELECT,
  });

  const shown = rows.slice(0, limit);

  const last = shown.at(-1);

  return { items: shown.map(intentSummary), nextCursor: rows.length > limit && last ? Buffer.from(JSON.stringify({ createdAt: last.createdAt.toISOString(), id: last.id })).toString("base64url") : null };
}
