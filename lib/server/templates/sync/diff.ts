import { collectKeysAndStrings } from "@/lib/server/templates/remap-ids";
import { classify } from "@/lib/server/templates/sync/classify";
import type { SyncDb } from "@/lib/server/templates/sync/context";
import { classifyLayered, type LayeredContext } from "@/lib/server/templates/sync/layered";
import type { LocalRow, SyncContext } from "@/lib/server/templates/sync/types";
import type { SourceDiff, SourceDiffItem, SourceSyncScope } from "@/types/campaigns";

type Usage = NonNullable<SourceDiffItem["usage"]>;

export async function buildDiff(db: SyncDb, ctx: SyncContext, scope?: SourceSyncScope, ruleLabel?: (key: string) => string): Promise<SourceDiff> {
  const items = classify(ctx, ruleLabel).filter((i) => i.visible && !i.ignored && (!scope || i.scope === scope));

  const usage = await countUsage(db, ctx.campaignId, ctx.target.rows, new Set(items.filter((i) => i.status === "deletedInSource" && i.localId).map((i) => i.localId!)));

  return {
    source: { id: ctx.source.id, name: ctx.source.name, kind: ctx.source.kind },
    syncedAt: ctx.syncedAt?.toISOString() ?? null,
    items: items.map(({ visible: _v, ignored: _i, ...i }): SourceDiffItem => {
      const used = i.localId ? usage.get(i.localId) : undefined;

      return used ? { ...i, usage: used } : i;
    }),
  };
}

export async function buildLayeredDiff(db: SyncDb, ctx: LayeredContext, scope?: SourceSyncScope): Promise<SourceDiff> {
  const items = classifyLayered(ctx).filter((i) => i.visible && !i.ignored && (!scope || i.scope === scope));

  const usage = await countUsage(db, ctx.campaignId, [], new Set(items.filter((i) => i.status === "deletedInSource").map((i) => i.key)));

  return {
    source: { id: ctx.source.id, name: ctx.source.name, kind: ctx.source.kind },
    syncedAt: ctx.syncedAt?.toISOString() ?? null,
    items: items.map(({ visible: _v, ignored: _i, ...i }): SourceDiffItem => (usage.has(i.key) ? { ...i, usage: usage.get(i.key) } : i)),
  };
}

async function countUsage(db: Pick<SyncDb, "character">, campaignId: string, rows: LocalRow[], ids: Set<string>): Promise<Map<string, Usage>> {
  if (ids.size === 0) return new Map();

  const out = new Map<string, Usage>(Array.from(ids, (id) => [id, { characters: 0, content: 0 }]));

  for (const r of rows) {
    for (const s of collectKeysAndStrings(r.row)) if (s !== r.row.id && out.has(s)) out.get(s)!.content++;
  }

  const characters = await db.character.findMany({
    where: { campaignId },
    select: { knownSpells: true, skillTreeProgress: true, personalSkillId: true, characterSkills: { select: { skillTreeId: true, unlockedSkills: true } } },
  });

  for (const c of characters) {
    const seen = collectKeysAndStrings(c);

    for (const id of ids) if (seen.has(id)) out.get(id)!.characters++;
  }

  return out;
}
