import { collectKeysAndStrings } from "@/lib/server/templates/remap-ids";
import { classify } from "@/lib/server/templates/sync/classify";
import type { SyncDb } from "@/lib/server/templates/sync/context";
import type { SyncContext } from "@/lib/server/templates/sync/types";
import type { SourceDiff, SourceDiffItem, SourceSyncScope } from "@/types/campaigns";

type Usage = NonNullable<SourceDiffItem["usage"]>;

export async function buildDiff(db: SyncDb, ctx: SyncContext, scope?: SourceSyncScope, ruleLabel?: (key: string) => string): Promise<SourceDiff> {
  const items = classify(ctx, ruleLabel).filter((i) => i.visible && !i.ignored && (!scope || i.scope === scope));

  const usage = await countUsage(db, ctx, new Set(items.filter((i) => i.status === "deletedInSource" && i.localId).map((i) => i.localId!)));

  return {
    source: { id: ctx.source.id, name: ctx.source.name, kind: ctx.source.kind },
    syncedAt: ctx.syncedAt?.toISOString() ?? null,
    items: items.map(({ visible: _v, ignored: _i, ...i }): SourceDiffItem => {
      const used = i.localId ? usage.get(i.localId) : undefined;

      return used ? { ...i, usage: used } : i;
    }),
  };
}

async function countUsage(db: SyncDb, ctx: SyncContext, ids: Set<string>): Promise<Map<string, Usage>> {
  if (ids.size === 0) return new Map();

  const out = new Map<string, Usage>(Array.from(ids, (id) => [id, { characters: 0, content: 0 }]));

  for (const r of ctx.target.rows) {
    for (const s of collectKeysAndStrings(r.row)) if (s !== r.row.id && out.has(s)) out.get(s)!.content++;
  }

  const characters = await db.character.findMany({
    where: { campaignId: ctx.campaignId },
    select: { knownSpells: true, skillTreeProgress: true, personalSkillId: true, characterSkills: { select: { skillTreeId: true, unlockedSkills: true } } },
  });

  for (const c of characters) {
    const seen = collectKeysAndStrings(c);

    for (const id of ids) if (seen.has(id)) out.get(id)!.characters++;
  }

  return out;
}
