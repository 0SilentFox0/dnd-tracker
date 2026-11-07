import type { Prisma } from "@prisma/client";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { SYNC_DEFAULT_ON } from "@/lib/constants/source-sync";
import { bypassLayer } from "@/lib/db/content-layer";
import { BASE_ONLY, layeredModels } from "@/lib/db/layer/config";
import type { SourceSyncApplyInput } from "@/lib/schemas/source-sync";
import { DETACH_KIND_BY_TABLE, detachRefs } from "@/lib/server/content/detach-refs";
import { ContentError } from "@/lib/server/content/errors";
import { markContentDirty } from "@/lib/server/content/write-context";
import { delegateOf } from "@/lib/server/templates/bundle";
import { rowHash } from "@/lib/server/templates/sync/hash";
import { classifyLayered, type LayeredContext, type LayeredDb, type LayerRef, loadLayeredContext, pendingKey, tableOf } from "@/lib/server/templates/sync/layered";
import { blockedByProfileWarning, isFeatUsedByRaceProfile } from "@/lib/server/templates/sync/profile-refs";
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

  const warnings: string[] = [];

  for (const i of items) await applyItem(db, campaignId, i, getEntry(ctx.ignored, i.scope, pendingKey(i.key)) !== undefined, warnings);

  const advancing = ctx.source.contentVersion > ctx.baseVersion;

  const deferred = advancing ? await keepUnselected(db, ctx, all, new Set(items.map(keyOf))) : [];

  await saveIgnored(db, ctx, items, ignored, deferred);

  if (advancing) {
    const { count } = await db.campaign.updateMany({ where: { id: campaignId, baseVersion: ctx.baseVersion }, data: { baseVersion: ctx.source.contentVersion } });

    if (count !== 1) throw new ContentError(API_ERRORS.SOURCE_CHANGED, 409);
  }

  return { applied: items.length, ignored: ignored.length, autoAdded: [], warnings };
}

async function applyItem(db: LayeredDb, campaignId: string, i: SyncItem, pending: boolean, warnings: string[]) {
  const t = tableOf(i.scope)!;

  const { hideTable } = layeredModels()[t.model];

  if (i.status === "deletedLocally" || (i.status === "new" && pending)) {
    const { count } = await db.campaignContentHide.deleteMany({ where: { campaignId, table: hideTable, id: i.key } });

    if (!count) return;
  } else if (i.localId) {
    if (i.status === "deletedInSource" && i.scope === "feats" && (await isFeatUsedByRaceProfile(db, campaignId, [i.localId, i.key]))) {
      warnings.push(blockedByProfileWarning(i.name));

      return;
    }

    const kind = i.status === "deletedInSource" ? DETACH_KIND_BY_TABLE[i.scope] : undefined;

    if (kind) await detachRefs(db as unknown as Parameters<typeof detachRefs>[0], campaignId, kind, [i.localId, i.key]);

    await bypassLayer(() => delegateOf(db, t).deleteMany({ where: { id: i.localId!, campaignId } }));
  } else return;

  markContentDirty();
}

/** Advancing baseVersion must not apply what the DM did not select: pin changed/removed rows at the old baseline, hide new ones (returned, so they stay restorable). */
async function keepUnselected(db: LayeredDb, ctx: LayeredContext, all: Map<string, SyncItem>, selected: Set<string>): Promise<SyncItem[]> {
  const deferred: SyncItem[] = [];

  const entries = new Map(ctx.entries.map((e) => [`${e.t.key}:${e.key}`, e]));

  for (const i of all.values()) {
    if (selected.has(keyOf(i)) || i.localId) continue;

    const e = entries.get(keyOf(i))!;

    if (i.status === "new") {
      await db.campaignContentHide.createMany({ data: [{ campaignId: ctx.campaignId, table: layeredModels()[e.t.model].hideTable, id: e.key }], skipDuplicates: true });

      deferred.push(i);
    } else if ((i.status === "updated" || i.status === "deletedInSource") && e.baseline) {
      const { id: _id, ...columns } = Object.fromEntries(Object.entries(e.baseline).filter(([k]) => !BASE_ONLY.has(k)));

      await bypassLayer(() => delegateOf(db, e.t).createMany({ data: [{ ...columns, campaignId: ctx.campaignId, sourceId: e.key, sourceHash: rowHash(e.baseline!, e.t) }] }));
    } else continue;

    markContentDirty();
  }

  return deferred;
}

async function saveIgnored(db: LayeredDb, ctx: LayeredContext, selected: SyncItem[], ignored: SyncItem[], deferred: SyncItem[]) {
  const next = cloneState(ctx.ignored);

  for (const i of selected)
    for (const key of [i.key, pendingKey(i.key)]) if (getEntry(next, i.scope, key) !== undefined) setEntry(next, i.scope, key, undefined);

  for (const i of deferred) setEntry(next, i.scope, pendingKey(i.key), i.sourceHash ?? IGNORED_DELETED);

  for (const i of ignored) setEntry(next, i.scope, i.key, i.sourceHash ?? IGNORED_DELETED);

  if (JSON.stringify(next) === JSON.stringify(ctx.ignored)) return;

  const data = { sourceCampaignId: ctx.source.id, sourceVersion: ctx.source.contentVersion, ignored: next as Prisma.InputJsonObject, syncedAt: new Date() };

  await db.campaignSourceSync.upsert({ where: { campaignId: ctx.campaignId }, create: { campaignId: ctx.campaignId, baseline: emptyState() as Prisma.InputJsonObject, ...data }, update: data });
}
