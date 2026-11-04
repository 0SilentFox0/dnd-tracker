import type { Prisma } from "@prisma/client";

import "server-only";
import { invalidateAllReference } from "@/lib/cache/tags";
import { prisma } from "@/lib/db";
import type { Locale } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/translator";
import type { SourceSyncApplyInput } from "@/lib/schemas/source-sync";
import { assertCan } from "@/lib/server/content/access";
import { CONTENT_OPERATIONS } from "@/lib/server/content/operations";
import { withCampaignContentWrite } from "@/lib/server/content/write";
import { afterContentCommit } from "@/lib/server/content/write-context";
import { applySafeSourceChanges, applySourceChanges } from "@/lib/server/templates/sync/apply";
import { loadSyncContext } from "@/lib/server/templates/sync/context";
import { buildDiff, buildLayeredDiff } from "@/lib/server/templates/sync/diff";
import { type LayeredDb,layerOf, loadLayeredContext } from "@/lib/server/templates/sync/layered";
import type { Actor, ActorNeed } from "@/lib/utils/api/actor";
import { localeOrRequest } from "@/lib/utils/api/translate-error";
import type { SourceApplyResult, SourceDiff, SourceSyncScope } from "@/types/campaigns";

const APPLY_TX_OPTIONS = { timeout: 60_000, maxWait: 10_000 };

export async function getSourceDiff(actor: Actor, scope?: SourceSyncScope, locale?: Locale | null): Promise<SourceDiff> {
  assertCan(actor, CONTENT_OPERATIONS["source.diff"].need);

  const layer = await layerOf(prisma, actor.campaignId);

  if (layer) return buildLayeredDiff(prisma, await loadLayeredContext(prisma as LayeredDb, actor.campaignId, layer, actor), scope);

  const t = await getTranslator(await localeOrRequest(locale), "rules");

  return buildDiff(prisma, await loadSyncContext(prisma, actor.campaignId, actor), scope, (key) => t(`mechanics.${key}.label`));
}

async function runApply(actor: Actor, need: ActorNeed, run: (tx: Prisma.TransactionClient) => Promise<SourceApplyResult>): Promise<SourceApplyResult> {
  assertCan(actor, need);

  // NO KEY UPDATE serialises applies without blocking inserts that reference the campaign
  const result = await withCampaignContentWrite(actor.campaignId, run, { lock: "no-key-update", ...APPLY_TX_OPTIONS });

  afterContentCommit(() => invalidateAllReference(actor.campaignId));

  return result;
}

export const applySource = (actor: Actor, body: SourceSyncApplyInput) => runApply(actor, CONTENT_OPERATIONS["source.apply"].need, tx => applySourceChanges(tx, actor.campaignId, body, actor));

export const applySafeSource = (actor: Actor) => runApply(actor, CONTENT_OPERATIONS["source.apply-safe"].need, tx => applySafeSourceChanges(tx, actor.campaignId, actor));
