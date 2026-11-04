import type { PrismaClient } from "@prisma/client";

import { lockCampaignRow } from "@/lib/server/campaigns/lock";
import { runContentWriteContext } from "@/lib/server/content/write-context";
import { BUNDLE_TABLES, type BundleTable } from "@/lib/server/templates/bundle";
import { checkEligibility } from "@/lib/server/templates/legacy-migration/eligibility";
import { referrerUpdates, writeMigration } from "@/lib/server/templates/legacy-migration/execute";
import { loadMigrationInput } from "@/lib/server/templates/legacy-migration/load";
import { findDroppedNotifications } from "@/lib/server/templates/legacy-migration/notifications";
import { planLegacyMigration } from "@/lib/server/templates/legacy-migration/plan";
import { discardPreImage, finalizePreImage, writePreImage } from "@/lib/server/templates/legacy-migration/preimage";
import { type Referrer, REFERRERS } from "@/lib/server/templates/legacy-migration/referrers";
import { LegacyMigrationError, type MigrationInput, type MigrationPlan, type MigrationReport, type PreImage, type ReferrerReport, type TableReport } from "@/lib/server/templates/legacy-migration/types";
import { verifyMigration } from "@/lib/server/templates/legacy-migration/verify";

export { undoMigration } from "@/lib/server/templates/legacy-migration/undo";

export type ExtendedPrisma = PrismaClient;

const TX_OPTIONS = { timeout: 120_000, maxWait: 10_000 };

const emptyTable = (): TableReport => ({ stored: 0, baseRef: 0, override: { updated: 0, conflict: 0, own: 0, orphan: 0 }, local: 0, hide: 0, hidePending: 0 });

function tablesOf(input: MigrationInput, plan: MigrationPlan): Partial<Record<BundleTable, TableReport>> {
  const tables = Object.fromEntries(BUNDLE_TABLES.map((t) => [t.key, { ...emptyTable(), stored: input.stored[t.key].length }])) as Record<BundleTable, TableReport>;

  for (const d of plan.decisions) {
    const row = tables[d.table];

    if (d.kind === "baseRef") row.baseRef += 1;
    else if (d.kind === "local") row.local += 1;
    else if (d.kind === "hide") {
      row.hide += 1;

      if (d.pending) row.hidePending += 1;
    } else if (d.reason === "templateChanged") row.override.updated += 1;
    else if (d.reason === "dmEdited") row.override.own += 1;
    else if (d.reason === "orphan") row.override.orphan += 1;
    else row.override.conflict += 1;
  }

  return tables;
}

function referrersOf(input: MigrationInput, plan: MigrationPlan): ReferrerReport[] {
  const updates = referrerUpdates({ input, idMap: plan.idMap });

  return input.referrers.map(({ r, rows }) => {
    const pkColumn = r.pk ?? "id";

    const mine = updates.filter((u) => u.model === r.model && rows.some((row) => row[pkColumn] === u.pk[pkColumn]));

    const cells: Record<string, number> = {};

    for (const u of mine) for (const c of u.cells) cells[c.column] = (cells[c.column] ?? 0) + 1;

    return { model: r.model, rows: rows.length, changedRows: mine.length, cells };
  });
}

async function withDroppedNotifications(db: object, args: { input: MigrationInput; plan: MigrationPlan }): Promise<MigrationInput> {
  const { input, plan } = args;

  const rows = input.referrers.find((x) => x.r.model === "PlayerNotification")?.rows ?? [];

  const dropped = await findDroppedNotifications(db, { rows, idMap: plan.idMap });

  if (dropped.length === 0) return input;

  const ids = new Set(dropped.map((n) => n.id));

  return { ...input, droppedNotifications: dropped, referrers: input.referrers.map((x) => (x.r.model === "PlayerNotification" ? { ...x, rows: x.rows.filter((n) => !ids.has(n.id)) } : x)) };
}

function warningsOf(input: MigrationInput, plan: MigrationPlan): MigrationReport["warnings"] {
  const counted = (code: string, count: number) => (count > 0 ? [{ code, count }] : []);

  return [
    ...plan.warnings,
    ...counted("PENDING_RULES_SETTINGS", input.pendingRulesSettings),
    ...counted("DROPPED_NOTIFICATIONS", input.droppedNotifications?.length ?? 0),
    ...(input.syncStateFallback ? [{ code: "SYNC_STATE_FALLBACK" }] : []),
  ];
}

function reportOf(args: { name: string | null; input: MigrationInput; plan: MigrationPlan; status: MigrationReport["status"] }): MigrationReport {
  const { input, plan } = args;

  return {
    campaignId: input.campaignId,
    name: args.name,
    sourceId: input.sourceId,
    version: input.version,
    status: args.status,
    tables: tablesOf(input, plan),
    referrers: referrersOf(input, plan),
    blockers: plan.blockers,
    warnings: warningsOf(input, plan),
  };
}

const ineligible = (args: { campaignId: string; name: string | null; reason: MigrationReport["status"]; detail?: string }): MigrationReport => ({
  campaignId: args.campaignId,
  name: args.name,
  sourceId: null,
  version: null,
  status: args.reason,
  ...(args.detail && { detail: args.detail }),
  tables: {},
  referrers: [],
  blockers: [],
  warnings: [],
});

type Reader = { campaign: { findUnique(args: unknown): Promise<{ name: string; contentVersion: number } | null> } };

const campaignOf = (db: object, campaignId: string) => (db as Reader).campaign.findUnique({ where: { id: campaignId }, select: { name: true, contentVersion: true } });

export async function dryRunCampaign(db: object, campaignId: string): Promise<MigrationReport> {
  const name = (await campaignOf(db, campaignId))?.name ?? null;

  const eligibility = await checkEligibility(db, campaignId);

  if (!eligibility.ok) return ineligible({ campaignId, name, reason: eligibility.reason, detail: eligibility.detail });

  const loaded = await loadMigrationInput(db, { campaignId, sourceId: eligibility.sourceId, version: eligibility.version });

  const plan = planLegacyMigration(loaded);

  return reportOf({ name, input: await withDroppedNotifications(db, { input: loaded, plan }), plan, status: "eligible" });
}

export interface MigrateSeams { registry?: readonly Referrer[]; mapPlan?: (plan: MigrationPlan) => MigrationPlan }

/** `seams` exist for tests that corrupt the registry or the plan to prove the verifier rolls back. */
export async function migrateCampaign(db: ExtendedPrisma, args: { campaignId: string; preImageDir: string; seams?: MigrateSeams }): Promise<MigrationReport & { preImagePath?: string }> {
  const { campaignId, preImageDir, seams } = args;

  let pending: string | undefined;

  const report = await db.$transaction((tx) => runContentWriteContext(campaignId, tx, async () => {
    await lockCampaignRow(tx, campaignId, "update");

    const campaign = await campaignOf(tx, campaignId);

    const name = campaign?.name ?? null;

    const eligibility = await checkEligibility(tx, campaignId);

    if (!eligibility.ok) return ineligible({ campaignId, name, reason: eligibility.reason, detail: eligibility.detail });

    for (const r of REFERRERS) if (r.mode === "remap" && r.lockSql) await tx.$queryRaw(r.lockSql(campaignId));

    const loaded = await loadMigrationInput(tx, { campaignId, sourceId: eligibility.sourceId, version: eligibility.version, registry: seams?.registry });

    const plan = (seams?.mapPlan ?? ((p: MigrationPlan) => p))(planLegacyMigration(loaded));

    const input = await withDroppedNotifications(tx, { input: loaded, plan });

    if (plan.blockers.length > 0) throw new LegacyMigrationError("ID_COLLISION", plan.blockers);

    const contentVersion = campaign!.contentVersion;

    const image: PreImage = {
      campaignId,
      createdAt: new Date().toISOString(),
      campaign: { baseSourceId: null, baseVersion: null, contentVersion },
      sourceSync: input.sourceSync,
      stored: input.stored,
      referrerCells: referrerUpdates({ input, idMap: plan.idMap }).flatMap((u) => u.cells),
      plan: { idMap: [...plan.idMap], hides: plan.hides },
      ...(input.droppedNotifications && { droppedNotifications: input.droppedNotifications }),
      postContentVersion: contentVersion + 1,
    };

    pending = await writePreImage(preImageDir, image);

    await writeMigration(tx, { input, plan });

    const residuals = await verifyMigration(tx, { input, plan });

    return { ...reportOf({ name, input, plan, status: "migrated" }), residuals };
  }), TX_OPTIONS).catch(async (e: unknown) => {
    if (pending) await discardPreImage(pending);

    throw e;
  });

  return pending ? { ...report, preImagePath: await finalizePreImage(pending) } : report;
}
