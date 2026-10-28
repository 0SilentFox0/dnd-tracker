import "server-only";
import { invalidateReference, ReferenceKind } from "@/lib/cache/tags";
import { prisma } from "@/lib/db";
import type { SourceSyncApplyInput } from "@/lib/schemas/source-sync";
import { assertCan } from "@/lib/server/content/access";
import { CONTENT_OPERATIONS } from "@/lib/server/content/operations";
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

  const result = await prisma.$transaction(
    async (tx) => {
      // NO KEY UPDATE serialises applies without blocking inserts that reference the campaign
      await tx.$queryRaw`SELECT id FROM campaigns WHERE id = ${actor.campaignId} FOR NO KEY UPDATE`;

      return applySourceChanges(tx, actor.campaignId, body, actor);
    },
    APPLY_TX_OPTIONS,
  );

  invalidateReference(Object.values(ReferenceKind), actor.campaignId);

  return result;
}
