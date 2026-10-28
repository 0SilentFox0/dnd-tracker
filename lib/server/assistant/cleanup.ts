import { Prisma } from "@prisma/client";

import "server-only";
import { prisma } from "@/lib/db";

export async function cleanupAssistantData(now = new Date(), db: Pick<Prisma.TransactionClient, "assistantIntent" | "assistantReceipt"> = prisma): Promise<{ expired: number; redacted: number; receiptsDeleted: number }> {
  const day = 24 * 60 * 60_000;

  const expired = await db.assistantIntent.updateMany({ where: { status: "pending", expiresAt: { lte: now } }, data: { status: "expired" } });

  const redacted = await db.assistantIntent.updateMany({
    where: { status: { in: ["expired", "rejected", "failed", "applied", "stale"] }, updatedAt: { lt: new Date(now.getTime() - 7 * day) }, redactedAt: null },
    data: { payload: Prisma.JsonNull, preview: Prisma.JsonNull, expected: Prisma.JsonNull, summary: "Вміст пропозиції очищено", targets: [], redactedAt: now },
  });

  const receipts = await db.assistantReceipt.deleteMany({ where: { updatedAt: { lt: new Date(now.getTime() - 90 * day) }, status: { in: ["applied", "rejected", "expired", "failed", "stale"] }, effectsStatus: "complete" } });

  return { expired: expired.count, redacted: redacted.count, receiptsDeleted: receipts.count };
}
