import type { Prisma } from "@prisma/client";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { ContentError } from "@/lib/server/content/errors";
import { BUNDLE_TABLES, delegateOf, SETTINGS_SELECT, settingsOf, type TemplateDb } from "@/lib/server/templates/bundle";
import { exportCampaign } from "@/lib/server/templates/export-campaign";
import { baselineFromBundle } from "@/lib/server/templates/sync/hash";
import { emptyState } from "@/lib/server/templates/sync/state";
import type { LocalRow, SyncContext, SyncState, TableHashes } from "@/lib/server/templates/sync/types";
import { canReadSource } from "@/lib/utils/api/is-dm";

export type SyncDb = TemplateDb & Pick<Prisma.TransactionClient, "campaignSourceSync" | "character">;

const asState = (v: unknown): SyncState => {
  const o = (v ?? {}) as Partial<SyncState>;

  const empty = emptyState();

  return { tables: o.tables ?? empty.tables, rules: o.rules ?? empty.rules, settings: o.settings };
};

export async function loadSyncContext(db: SyncDb, campaignId: string, access?: { userId: string }): Promise<SyncContext> {
  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    select: { createdFromId: true, rules: true, ...SETTINGS_SELECT },
  });

  if (!campaign) throw new ContentError(API_ERRORS.CAMPAIGN_NOT_FOUND, 404);

  if (!campaign.createdFromId) throw new ContentError(API_ERRORS.SOURCE_NONE, 404);

  const found = await db.campaign.findUnique({
    where: { id: campaign.createdFromId },
    select: { id: true, name: true, kind: true, visibility: true, members: { where: { userId: access?.userId ?? "" }, select: { role: true } } },
  });

  if (!found) throw new ContentError(API_ERRORS.SOURCE_NOT_FOUND, 404);

  if (access && !canReadSource(found.visibility, found.members)) throw new ContentError(API_ERRORS.SOURCE_FORBIDDEN, 403);

  const source = { id: found.id, name: found.name, kind: found.kind };

  const [sourceBundle, rows, state] = await Promise.all([
    exportCampaign(db, source.id),
    loadTargetRows(db, campaignId),
    db.campaignSourceSync.findUnique({ where: { campaignId } }),
  ]);

  const synced = state?.sourceCampaignId === source.id ? state : null;

  const { baseline, ignored } = synced
    ? { baseline: asState(synced.baseline), ignored: asState(synced.ignored) }
    : { baseline: fallbackBaseline(sourceBundle, rows), ignored: emptyState() };

  return {
    campaignId,
    source,
    sourceBundle,
    target: { settings: settingsOf(campaign), rules: campaign.rules, rows },
    baseline,
    ignored,
    syncedAt: state?.syncedAt ?? null,
  };
}

async function loadTargetRows(db: TemplateDb, campaignId: string): Promise<LocalRow[]> {
  const out: LocalRow[] = [];

  for (const t of BUNDLE_TABLES) {
    const rows = await delegateOf(db, t).findMany({
      where: { campaignId },
      select: Object.fromEntries([...t.columns, "sourceId", "sourceHash"].map((c) => [c, true])),
    });

    for (const { sourceHash, ...row } of rows) out.push({ table: t.key, row: row as LocalRow["row"], sourceHash: (sourceHash as string | null) ?? null });
  }

  return out;
}

// campaigns cloned before stage 3: rows' sourceHash is the baseline, rules/settings count as synced
function fallbackBaseline(sourceBundle: SyncContext["sourceBundle"], rows: LocalRow[]): SyncState {
  const tables: TableHashes = {};

  for (const r of rows) if (r.row.sourceId && r.sourceHash) (tables[r.table] ??= {})[r.row.sourceId] = r.sourceHash;

  return baselineFromBundle(sourceBundle, tables);
}
