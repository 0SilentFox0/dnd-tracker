import type { Prisma } from "@prisma/client";

import { intentOwner } from "./intent-store";
import type { AssistantCaller, ReceiptDto } from "./types";

import "server-only";
import { prisma } from "@/lib/db";
import { actionResultSchema, intentStatusSchema } from "@/lib/schemas/assistant";
import { ContentError, parseInput } from "@/lib/server/content/errors";

export async function readReceipt(caller: AssistantCaller, intentId: string, db: Pick<Prisma.TransactionClient, "assistantReceipt"> = prisma): Promise<ReceiptDto> {
  const row = await db.assistantReceipt.findFirst({ where: { intentId, ...intentOwner(caller) } });

  if (!row) throw new ContentError("Результат дії не знайдено", 404);

  const effectsStatus = row.effectsStatus;

  if (!["pending", "complete", "failed", "unknown"].includes(effectsStatus)) throw new ContentError("Некоректний статус результату", 500);

  return { id: row.id, status: parseInput(intentStatusSchema, row.status), result: row.result === null ? null : parseInput(actionResultSchema, row.result), effectsStatus: effectsStatus as ReceiptDto["effectsStatus"] };
}

/** A narrow tombstone grant survives the deleted campaign; it exposes no old data.
 * userId must come from requireAuth, not a model or request body. */
export async function readDeletionReceipt(userId: string, campaignId: string, intentId: string, db: Pick<Prisma.TransactionClient, "assistantReceipt"> = prisma) {
  if (!userId || !campaignId || !intentId) throw new ContentError("Результат дії не знайдено", 404);

  const row = await db.assistantReceipt.findFirst({ where: { userId, campaignId, intentId, actionId: "campaign.delete", status: "applied" }, select: { id: true } });

  if (!row) throw new ContentError("Результат дії не знайдено", 404);

  return { id: row.id, status: "applied" as const, deleted: true };
}
