import { bypassLayer } from "@/lib/db/content-layer";
import { layeredModels } from "@/lib/db/layer/config";
import { BUNDLE_TABLES, type BundleTable } from "@/lib/server/templates/bundle";
import { referrerRows,REFERRERS } from "@/lib/server/templates/legacy-migration/referrers";
import type { MigrationInput, Row } from "@/lib/server/templates/legacy-migration/types";
import { classify } from "@/lib/server/templates/sync/classify";
import { loadSyncContext, type SyncDb } from "@/lib/server/templates/sync/context";

interface FindMany { findMany(args: unknown): Promise<Row[]> }

const TABLE_KEYS: ReadonlySet<string> = new Set(BUNDLE_TABLES.map((t) => t.key));

export async function loadMigrationInput(db: object, args: { campaignId: string; sourceId: string; version: number }): Promise<MigrationInput> {
  const { campaignId, sourceId, version } = args;

  const d = db as Record<string, FindMany>;

  const ctx = await loadSyncContext(db as SyncDb, campaignId);

  const items = classify(ctx);

  const stored = {} as Record<BundleTable, Row[]>;

  const base = {} as MigrationInput["base"];

  for (const t of BUNDLE_TABLES) {
    stored[t.key] = await bypassLayer(() => d[t.delegate].findMany({ where: { campaignId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] }));

    const rows = await d[layeredModels()[t.model].base].findMany({
      where: { sourceCampaignId: sourceId, validFrom: { lte: version }, OR: [{ validTo: null }, { validTo: { gt: version } }] },
    });

    base[t.key] = new Map(rows.map((r) => [r.id, r]));
  }

  const referrers: MigrationInput["referrers"] = [];

  for (const r of REFERRERS) if (r.mode === "remap") referrers.push({ r, rows: (await referrerRows(db, r, campaignId)) as Row[] });

  const sync = (await (db as { campaignSourceSync: { findUnique(args: unknown): Promise<Row | null> } }).campaignSourceSync.findUnique({ where: { campaignId } })) ?? null;

  return {
    campaignId,
    sourceId,
    version,
    stored,
    base,
    baseline: ctx.baseline.tables,
    ignored: ctx.ignored,
    referrers,
    legacyItems: items.filter((i) => TABLE_KEYS.has(i.scope)),
    pendingRulesSettings: items.filter((i) => i.scope === "rules" || i.scope === "settings").length,
    syncStateFallback: !sync || sync.sourceCampaignId !== sourceId,
    sourceSync: sync,
  };
}
