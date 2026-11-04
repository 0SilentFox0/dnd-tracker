import type { Prisma } from "@prisma/client";

import { ContentError } from "./errors";
import { type ContentEffect, currentContentWrite, markContentDirty, runContentEffects, runContentWriteContext } from "./write-context";

import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { lockCampaignRow } from "@/lib/server/campaigns/lock";

export interface ContentWriteOptions { lock?: "update" | "no-key-update"; timeout?: number; maxWait?: number; bump?: boolean }

export async function withCampaignContentWrite<T>(campaignId: string, callback: (tx: Prisma.TransactionClient) => Promise<T>, options: ContentWriteOptions = {}): Promise<T> {
  const current = currentContentWrite();

  const bump = options.bump !== false;

  if (current) {
    if (current.campaignId !== campaignId) throw new ContentError(API_ERRORS.CONTENT_CROSS_CAMPAIGN_WRITE, 403);

    if (bump) markContentDirty();

    return callback(current.db as Prisma.TransactionClient);
  }

  const afterCommit: ContentEffect[] = [];

  const result = await prisma.$transaction(async (tx) => {
    const rows = await lockCampaignRow(tx, campaignId, options.lock);

    if (rows.length !== 1) throw new ContentError(API_ERRORS.CAMPAIGN_NOT_FOUND, 404);

    return runContentWriteContext(campaignId, tx, () => {
      if (bump) markContentDirty();

      return callback(tx);
    }, afterCommit);
  }, { timeout: options.timeout ?? 30_000, maxWait: options.maxWait ?? 5_000 });

  await runContentEffects(afterCommit);

  return result;
}

export const withCampaignRuntimeWrite = <T>(campaignId: string, callback: (tx: Prisma.TransactionClient) => Promise<T>, options: Omit<ContentWriteOptions, "bump"> = {}) => withCampaignContentWrite(campaignId, callback, { ...options, bump: false });
