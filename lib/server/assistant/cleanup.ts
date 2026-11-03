import { Prisma } from "@prisma/client";

import "server-only";
import { ASSISTANT_DELETABLE_RECEIPT_STATUSES,ASSISTANT_LIMITS, ASSISTANT_REDACTABLE_INTENT_STATUSES } from "@/lib/constants/assistant";
import { DAY_MS } from "@/lib/constants/time";
import { prisma } from "@/lib/db";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/translator";

export async function cleanupAssistantData(now = new Date(), db: Pick<Prisma.TransactionClient, "assistantIntent" | "assistantReceipt"> = prisma): Promise<{ expired: number; redacted: number; receiptsDeleted: number }> {
  const expired = await db.assistantIntent.updateMany({ where: { status: "pending", expiresAt: { lte: now } }, data: { status: "expired" } });

  const redacted = await db.assistantIntent.updateMany({
    where: { status: { in: [...ASSISTANT_REDACTABLE_INTENT_STATUSES] }, updatedAt: { lt: new Date(now.getTime() - ASSISTANT_LIMITS.intentRedactionDays * DAY_MS) }, redactedAt: null },
    data: { payload: Prisma.JsonNull, preview: Prisma.JsonNull, expected: Prisma.JsonNull, summary: (await getTranslator(DEFAULT_LOCALE, "assistant"))("summary.cleared"), targets: [], redactedAt: now },
  });

  const receipts = await db.assistantReceipt.deleteMany({ where: { updatedAt: { lt: new Date(now.getTime() - ASSISTANT_LIMITS.receiptRetentionDays * DAY_MS) }, status: { in: [...ASSISTANT_DELETABLE_RECEIPT_STATUSES] }, effectsStatus: "complete" } });

  return { expired: expired.count, redacted: redacted.count, receiptsDeleted: receipts.count };
}
