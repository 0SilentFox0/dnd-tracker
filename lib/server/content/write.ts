import type { Prisma } from "@prisma/client";

import { ContentError } from "./errors";
import { currentContentWrite, runContentWriteContext } from "./write-context";

import "server-only";
import { prisma } from "@/lib/db";

export async function withCampaignContentWrite<T>(campaignId: string, callback: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  const current = currentContentWrite();

  if (current) {
    if (current.campaignId !== campaignId) throw new ContentError("Перехресний запис між кампаніями заборонено", 403);

    return callback(current.db as Prisma.TransactionClient);
  }

  const afterCommit: Array<() => void> = [];

  const result = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM campaigns WHERE id = ${campaignId} FOR UPDATE`;

    if (rows.length !== 1) throw new ContentError("Кампанію не знайдено", 404);

    return runContentWriteContext(campaignId, tx, () => callback(tx), afterCommit);
  }, { timeout: 30_000, maxWait: 5_000 });

  for (const effect of afterCommit) await effect();

  return result;
}
