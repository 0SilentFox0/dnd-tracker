import type { Prisma } from "@prisma/client";

import { ContentError } from "./errors";
import { type ContentEffect, currentContentWrite, runContentEffects, runContentWriteContext } from "./write-context";

import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";

export async function withCampaignContentWrite<T>(campaignId: string, callback: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  const current = currentContentWrite();

  if (current) {
    if (current.campaignId !== campaignId) throw new ContentError(API_ERRORS.CONTENT_CROSS_CAMPAIGN_WRITE, 403);

    return callback(current.db as Prisma.TransactionClient);
  }

  const afterCommit: ContentEffect[] = [];

  const result = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM campaigns WHERE id = ${campaignId} FOR UPDATE`;

    if (rows.length !== 1) throw new ContentError(API_ERRORS.CAMPAIGN_NOT_FOUND, 404);

    return runContentWriteContext(campaignId, tx, () => callback(tx), afterCommit);
  }, { timeout: 30_000, maxWait: 5_000 });

  await runContentEffects(afterCommit);

  return result;
}
