import type { Prisma } from "@prisma/client";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { SYNC_DEFAULT_ON } from "@/lib/constants/source-sync";
import { bypassLayer } from "@/lib/db/content-layer";
import { layeredModels } from "@/lib/db/layer/config";
import type { SourceSyncApplyInput } from "@/lib/schemas/source-sync";
import { ContentError } from "@/lib/server/content/errors";
import { markContentDirty } from "@/lib/server/content/write-context";
import { delegateOf } from "@/lib/server/templates/bundle";
import { classifyLayered, type LayeredContext, type LayeredDb, type LayerRef, loadLayeredContext, tableOf } from "@/lib/server/templates/sync/layered";
import { keyOf, sourceSelection } from "@/lib/server/templates/sync/selection";
import { cloneState, emptyState, getEntry, setEntry } from "@/lib/server/templates/sync/state";
import { IGNORED_DELETED, type SyncItem } from "@/lib/server/templates/sync/types";
import type { SourceApplyResult } from "@/types/campaigns";

async function load(db: LayeredDb, campaignId: string, layer: LayerRef, access?: { userId: string }) {
  const ctx = await loadLayeredContext(db, campaignId, layer, access);

  return { ctx, all: new Map(classifyLayered(ctx).map((i) => [keyOf(i), i])) };
}

export async function previewLayeredSelection(db: LayeredDb, campaignId: string, layer: LayerRef, body: SourceSyncApplyInput, access?: { userId: string }) {
  const { ctx, all } = await load(db, campaignId, layer, access);

  const { items, ignored } = sourceSelection(all, body);

  const entries = new Map(ctx.entries.map((e) => [`${e.t.key}:${e.key}`, e]));

  return {
    sourceId: ctx.source.id,
    items: items.map((i) => ({ ...i, before: entries.get(keyOf(i))?.override?.row ?? null, after: i.status === "deletedInSource" ? null : entries.get(keyOf(i))?.source ?? null })),
    ignored,
    autoAdded: [],
    credits: { before: null, after: null },
  };
}

export async function applyLayered(db: LayeredDb, campaignId: string, layer: LayerRef, body: SourceSyncApplyInput | "safe", access?: { userId: string }): Promise<SourceApplyResult> {
  const { ctx, all } = await load(db, campaignId, layer, access);

  const refs: SourceSyncApplyInput =
    body === "safe"
      ? { apply: [...all.values()].filter((i) => i.visible && !i.ignored && SYNC_DEFAULT_ON.has(i.status)).map(({ scope, key, sourceHash, status }) => ({ scope, key, sourceHash, status })), ignore: [] }
      : body;

  const { items, ignored } = sourceSelection(all, refs);

  for (const i of items) await applyItem(db, campaignId, i);

  await saveIgnored(db, ctx, items, ignored);

  if (ctx.source.contentVersion > ctx.baseVersion) {
    const { count } = await db.campaign.updateMany({ where: { id: campaignId, baseVersion: ctx.baseVersion }, data: { baseVersion: ctx.source.contentVersion } });

    if (count !== 1) throw new ContentError(API_ERRORS.SOURCE_CHANGED, 409);
  }

  return { applied: items.length, ignored: ignored.length, autoAdded: [], warnings: [] };
}

async function applyItem(db: LayeredDb, campaignId: string, i: SyncItem) {
  const t = tableOf(i.scope)!;

  const { hideTable } = layeredModels()[t.model];

  if (i.status === "deletedLocally") await db.campaignContentHide.deleteMany({ where: { campaignId, table: hideTable, id: i.key } });
  else if (i.status !== "deletedInSource" && i.localId) await bypassLayer(() => delegateOf(db, t).deleteMany({ where: { id: i.localId!, campaignId } }));
  else return;

  markContentDirty();
}

async function saveIgnored(db: LayeredDb, ctx: LayeredContext, selected: SyncItem[], ignored: SyncItem[]) {
  const next = cloneState(ctx.ignored);

  for (const i of selected) if (getEntry(next, i.scope, i.key) !== undefined) setEntry(next, i.scope, i.key, undefined);

  for (const i of ignored) setEntry(next, i.scope, i.key, i.sourceHash ?? IGNORED_DELETED);

  if (JSON.stringify(next) === JSON.stringify(ctx.ignored)) return;

  const data = { sourceCampaignId: ctx.source.id, sourceVersion: ctx.source.contentVersion, ignored: next as Prisma.InputJsonObject, syncedAt: new Date() };

  await db.campaignSourceSync.upsert({ where: { campaignId: ctx.campaignId }, create: { campaignId: ctx.campaignId, baseline: emptyState() as Prisma.InputJsonObject, ...data }, update: data });
}
