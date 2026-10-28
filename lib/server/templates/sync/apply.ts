import type { Prisma } from "@prisma/client";

import { API_ERRORS } from "@/lib/constants/api-errors";
import type { SourceSyncApplyInput } from "@/lib/schemas/source-sync";
import { ContentError } from "@/lib/server/content/errors";
import { moveSkillTreeProgress } from "@/lib/server/skills/progress-move";
import { assertNoLeak, findForeignContentIds } from "@/lib/server/templates/assert-no-leak";
import { BUNDLE_TABLES, type BundleTableDef, delegateOf, pick, settingsOf, TemplateLeakError, toPrismaJson } from "@/lib/server/templates/bundle";
import { newContentId } from "@/lib/server/templates/ids";
import { collectKeysAndStrings, remapIds } from "@/lib/server/templates/remap-ids";
import { classify } from "@/lib/server/templates/sync/classify";
import { loadSyncContext, type SyncDb } from "@/lib/server/templates/sync/context";
import { indexOf } from "@/lib/server/templates/sync/index";
import { cloneState, setEntry } from "@/lib/server/templates/sync/state";
import { IGNORED_DELETED, type SyncContext, type SyncItem } from "@/lib/server/templates/sync/types";
import { parseRules } from "@/lib/utils/rules/schema";
import { readTreeJson } from "@/lib/utils/skills/progression";
import type { SourceApplyResult, SyncRef } from "@/types/campaigns";

const keyOf = (i: { scope: string; key: string }) => `${i.scope}:${i.key}`;

const sourceChanged = () => new ContentError(API_ERRORS.SOURCE_CHANGED, 409);

export async function applySourceChanges(db: SyncDb, campaignId: string, body: SourceSyncApplyInput, access?: { userId: string }): Promise<SourceApplyResult> {
  const ctx = await loadSyncContext(db, campaignId, access);

  const all = new Map(classify(ctx).map((i) => [keyOf(i), i]));

  const pickItems = (refs: SyncRef[]) =>
    refs.map((r) => {
      const item = all.get(keyOf(r));

      if (!item || item.sourceHash !== r.sourceHash || item.status !== r.status) throw sourceChanged();

      return item;
    });

  const chosen = pickItems(body.apply);

  const ignored = pickItems(body.ignore);

  const { selected, autoAdded } = closeOverRequires(chosen, all);

  const items = [...selected.values()];

  const warnings = await writeTables(db, ctx, selected);

  await writeCampaign(db, ctx, items);

  await saveState(db, ctx, items, ignored);

  return { applied: items.length, ignored: ignored.length, autoAdded: autoAdded.map(({ scope, key, name }) => ({ scope, key, name })), warnings };
}

function closeOverRequires(chosen: SyncItem[], all: Map<string, SyncItem>) {
  const selected = new Map(chosen.map((i) => [keyOf(i), i]));

  const autoAdded: SyncItem[] = [];

  const queue = [...chosen];

  while (queue.length > 0) {
    for (const req of queue.pop()!.requires) {
      const k = keyOf(req);

      const dep = all.get(k);

      if (selected.has(k) || !dep || (dep.status !== "new" && dep.status !== "deletedLocally")) continue;

      selected.set(k, dep);
      autoAdded.push(dep);
      queue.push(dep);
    }
  }

  return { selected, autoAdded };
}

function cleanRow(t: BundleTableDef, src: Record<string, unknown>, item: SyncItem, map: Map<string, string>, warnings: string[]) {
  const clean = pick(src, t.columns);

  for (const col of Object.keys(t.fks)) {
    const ref = clean[col];

    if (typeof ref === "string" && !map.has(ref)) {
      warnings.push(`${t.key} ${item.name}: ${col} → null`);
      clean[col] = null;
    }
  }

  const data = remapIds(clean, map);

  delete data.id;

  return data;
}

async function deleteRemoved(db: SyncDb, ctx: SyncContext, selected: Map<string, SyncItem>) {
  for (const t of [...BUNDLE_TABLES].reverse()) {
    for (const i of selected.values()) {
      if (i.scope !== t.key || i.status !== "deletedInSource" || !i.localId) continue;

      await delegateOf(db, t).deleteMany({ where: { id: i.localId, campaignId: ctx.campaignId } });
    }
  }
}

async function writeTables(db: SyncDb, ctx: SyncContext, selected: Map<string, SyncItem>): Promise<string[]> {
  const warnings: string[] = [];

  const index = indexOf(ctx);

  const map = new Map(index.sourceToLocal);

  for (const i of selected.values()) if (i.status === "new" || i.status === "deletedLocally") map.set(i.key, newContentId());

  const written: unknown[] = [];

  for (const t of BUNDLE_TABLES) {
    const toCreate: Record<string, unknown>[] = [];

    for (const src of ctx.sourceBundle[t.key]) {
      const item = selected.get(`${t.key}:${src.id}`);

      if (!item) continue;

      const data = cleanRow(t, src, item, map, warnings);

      written.push(data);

      if (item.localId) {
        const { count } = await delegateOf(db, t).updateMany({
          where: { id: item.localId, campaignId: ctx.campaignId },
          data: toPrismaJson({ ...data, sourceHash: item.sourceHash }, t),
        });

        if (count !== 1) throw sourceChanged();

        if (t.key === "skillTrees") await moveTreeProgress(db, ctx, item.localId, data);
      } else {
        toCreate.push(toPrismaJson({ ...data, id: map.get(src.id), campaignId: ctx.campaignId, sourceId: src.id, sourceHash: item.sourceHash }, t));
      }
    }

    if (toCreate.length > 0) await delegateOf(db, t).createMany({ data: toCreate });
  }

  await assertWritable(db, ctx, written, index.sourceIds, new Set(map.values()));

  await deleteRemoved(db, ctx, selected);

  return warnings;
}

async function assertWritable(db: SyncDb, ctx: SyncContext, written: unknown[], sourceIds: Set<string>, newIds: Set<string>) {
  try {
    assertNoLeak(written, sourceIds);
  } catch (error) {
    if (error instanceof TemplateLeakError) throw new ContentError(API_ERRORS.SOURCE_LEAK, 422);

    throw error;
  }

  const own = new Set([...indexOf(ctx).localById.keys(), ...newIds]);

  const foreign = await findForeignContentIds(db, collectKeysAndStrings(written), own);

  if (foreign.length > 0) throw new ContentError(API_ERRORS.SOURCE_FOREIGN_IDS, 422);
}

async function moveTreeProgress(db: SyncDb, ctx: SyncContext, localId: string, next: Record<string, unknown>) {
  const old = indexOf(ctx).localById.get(localId)?.row;

  const from = old && readTreeJson(old.skills).id;

  const to = readTreeJson(next.skills).id;

  if (!old || !from || !to || from === to) return;

  await moveSkillTreeProgress(db, ctx.campaignId, String(old.race), from, to);
}

async function writeCampaign(db: SyncDb, ctx: SyncContext, selected: SyncItem[]) {
  const rules = selected.filter((i) => i.scope === "rules");

  const settings = selected.some((i) => i.scope === "settings");

  const credits = ctx.sourceBundle.credits ?? null;

  const creditsChanged = credits !== (ctx.target.credits ?? null);

  if (rules.length === 0 && !settings && !creditsChanged) return;

  const src = parseRules(ctx.sourceBundle.rules) as Record<string, unknown>;

  const next = { ...(parseRules(ctx.target.rules) as Record<string, unknown>) };

  for (const r of rules) next[r.key] = src[r.key];

  await db.campaign.update({
    where: { id: ctx.campaignId },
    data: {
      ...(rules.length > 0 && { rules: next as Prisma.InputJsonObject }),
      ...(settings && settingsOf(ctx.sourceBundle.settings)),
      ...(creditsChanged && { credits }),
    },
  });
}

async function saveState(db: SyncDb, ctx: SyncContext, selected: SyncItem[], ignored: SyncItem[]) {
  const baseline = cloneState(ctx.baseline);

  const ign = cloneState(ctx.ignored);

  for (const i of selected) {
    setEntry(baseline, i.scope, i.key, i.status === "deletedInSource" ? undefined : i.sourceHash!);
    setEntry(ign, i.scope, i.key, undefined);
  }

  for (const i of ignored) setEntry(ign, i.scope, i.key, i.sourceHash ?? IGNORED_DELETED);

  // deleted on both sides: no S, no local row
  const { sourceIds, sourceToLocal } = indexOf(ctx);

  for (const t of BUNDLE_TABLES) for (const k of Object.keys(baseline.tables[t.key] ?? {})) if (!sourceIds.has(k) && !sourceToLocal.has(k)) delete baseline.tables[t.key]![k];

  const data = {
    sourceCampaignId: ctx.source.id,
    baseline: baseline as Prisma.InputJsonObject,
    ignored: ign as Prisma.InputJsonObject,
    syncedAt: new Date(),
  };

  await db.campaignSourceSync.upsert({ where: { campaignId: ctx.campaignId }, create: { campaignId: ctx.campaignId, ...data }, update: data });
}
