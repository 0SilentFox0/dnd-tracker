import type { Prisma } from "@prisma/client";

import { ContentError } from "./errors";
import { type ContentEffect, currentContentWrite, runContentEffects, runContentWriteContext } from "./write-context";

import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";

export interface ContentWriteOptions { lock?: "update" | "no-key-update"; timeout?: number; maxWait?: number }

export async function withCampaignContentWrite<T>(campaignId: string, callback: (tx: Prisma.TransactionClient) => Promise<T>, options: ContentWriteOptions = {}): Promise<T> {
  const current = currentContentWrite();

  if (current) {
    if (current.campaignId !== campaignId) throw new ContentError(API_ERRORS.CONTENT_CROSS_CAMPAIGN_WRITE, 403);

    return callback(current.db as Prisma.TransactionClient);
  }

  const afterCommit: ContentEffect[] = [];

  const result = await prisma.$transaction(async (tx) => {
    const rows = options.lock === "no-key-update"
      ? await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM campaigns WHERE id = ${campaignId} FOR NO KEY UPDATE`
      : await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM campaigns WHERE id = ${campaignId} FOR UPDATE`;

    if (rows.length !== 1) throw new ContentError(API_ERRORS.CAMPAIGN_NOT_FOUND, 404);

    return runContentWriteContext(campaignId, tx, () => callback(tx), afterCommit);
  }, { timeout: options.timeout ?? 30_000, maxWait: options.maxWait ?? 5_000 });

  await runContentEffects(afterCommit);

  return result;
}
