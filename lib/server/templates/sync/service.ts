import "server-only";
import { invalidateAllReference } from "@/lib/cache/tags";
import { prisma } from "@/lib/db";
import type { SourceSyncApplyInput } from "@/lib/schemas/source-sync";
import { assertCan } from "@/lib/server/content/access";
import { CONTENT_OPERATIONS } from "@/lib/server/content/operations";
import { withCampaignContentWrite } from "@/lib/server/content/write";
import { afterContentCommit } from "@/lib/server/content/write-context";
import { applySourceChanges } from "@/lib/server/templates/sync/apply";
import { loadSyncContext } from "@/lib/server/templates/sync/context";
import { buildDiff } from "@/lib/server/templates/sync/diff";
import type { Actor } from "@/lib/utils/api/actor";
import type { SourceApplyResult, SourceDiff, SourceSyncScope } from "@/types/campaigns";

const APPLY_TX_OPTIONS = { timeout: 60_000, maxWait: 10_000 };

export async function getSourceDiff(actor: Actor, scope?: SourceSyncScope): Promise<SourceDiff> {
  assertCan(actor, CONTENT_OPERATIONS["source.diff"].need);

  return buildDiff(prisma, await loadSyncContext(prisma, actor.campaignId, actor), scope);
}

export async function applySource(actor: Actor, body: SourceSyncApplyInput): Promise<SourceApplyResult> {
  assertCan(actor, CONTENT_OPERATIONS["source.apply"].need);

  // NO KEY UPDATE serialises applies without blocking inserts that reference the campaign
  const result = await withCampaignContentWrite(actor.campaignId, tx => applySourceChanges(tx, actor.campaignId, body, actor), { lock: "no-key-update", ...APPLY_TX_OPTIONS });

  afterContentCommit(() => invalidateAllReference(actor.campaignId));

  return result;
}
