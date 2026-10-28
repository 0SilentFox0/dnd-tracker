import { Prisma } from "@prisma/client";

import "server-only";
import { ASSISTANT_DELETABLE_RECEIPT_STATUSES,ASSISTANT_LIMITS, ASSISTANT_REDACTABLE_INTENT_STATUSES } from "@/lib/constants/assistant";
import { prisma } from "@/lib/db";

export async function cleanupAssistantData(now = new Date(), db: Pick<Prisma.TransactionClient, "assistantIntent" | "assistantReceipt"> = prisma): Promise<{ expired: number; redacted: number; receiptsDeleted: number }> {
  const day = 24 * 60 * 60_000;

  const expired = await db.assistantIntent.updateMany({ where: { status: "pending", expiresAt: { lte: now } }, data: { status: "expired" } });

  const redacted = await db.assistantIntent.updateMany({
    where: { status: { in: [...ASSISTANT_REDACTABLE_INTENT_STATUSES] }, updatedAt: { lt: new Date(now.getTime() - ASSISTANT_LIMITS.intentRedactionDays * day) }, redactedAt: null },
    data: { payload: Prisma.JsonNull, preview: Prisma.JsonNull, expected: Prisma.JsonNull, summary: "Вміст пропозиції очищено", targets: [], redactedAt: now },
  });

  const receipts = await db.assistantReceipt.deleteMany({ where: { updatedAt: { lt: new Date(now.getTime() - ASSISTANT_LIMITS.receiptRetentionDays * day) }, status: { in: [...ASSISTANT_DELETABLE_RECEIPT_STATUSES] }, effectsStatus: "complete" } });

  return { expired: expired.count, redacted: redacted.count, receiptsDeleted: receipts.count };
}
