#!/usr/bin/env tsx
// pnpm constructor:legacy-layers (--campaign <id> | --all) [--dry-run] [--json <file>] [--allow-remote]
//                                --campaign <id> --apply | --verify <pre-image> | --undo <pre-image>
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertSeedTarget } from "../seed/seed-library-lib";

import { prisma } from "@/lib/db";
import { dryRunCampaign, type ExtendedPrisma, migrateCampaign, undoMigration } from "@/lib/server/templates/legacy-migration/service";
import { type MigrationReport } from "@/lib/server/templates/legacy-migration/types";
import { verifyFromPreImage } from "@/lib/server/templates/legacy-migration/verify";

export type Mode = "dry-run" | "apply" | "verify" | "undo";

export interface Args { mode: Mode; campaigns: string[]; all: boolean; json?: string; preImage?: string; allowRemote: boolean }

export class UsageError extends Error {}

const PRE_IMAGE_DIR = path.join(".migration-backup", "legacy-layers");

const WAIT_REMINDER = "wait >= 6 min (reference cache 300 s + plain TTL) before checking the campaign in the browser";

export function parseArgs(argv: string[]): Args {
  const args: Args = { mode: "dry-run", campaigns: [], all: false, allowRemote: false };

  const value = (i: number, flag: string) => {
    const v = argv[i + 1];

    if (!v || v.startsWith("--")) throw new UsageError(`${flag} needs a value`);

    return v;
  };

  const modes = new Set<Mode>();

  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];

    if (flag === "--campaign") args.campaigns.push(value(i++, flag));
    else if (flag === "--all") args.all = true;
    else if (flag === "--dry-run") modes.add("dry-run");
    else if (flag === "--apply") modes.add("apply");
    else if (flag === "--verify") {
      modes.add("verify");
      args.preImage = value(i++, flag);
    } else if (flag === "--undo") {
      modes.add("undo");
      args.preImage = value(i++, flag);
    } else if (flag === "--json") args.json = value(i++, flag);
    else if (flag === "--allow-remote") args.allowRemote = true;
    else throw new UsageError(`unknown argument ${flag}`);
  }

  if (modes.size > 1) throw new UsageError("--dry-run, --apply, --verify and --undo are mutually exclusive");

  if (modes.size === 1) args.mode = [...modes][0];

  if (args.mode === "apply") {
    if (args.all) throw new UsageError("--all is only allowed with --dry-run");

    if (args.campaigns.length !== 1) throw new UsageError("--apply needs exactly one --campaign");
  }

  if (args.mode === "dry-run" && !args.all && args.campaigns.length === 0) throw new UsageError("dry-run needs --campaign <id> or --all");

  if ((args.mode === "verify" || args.mode === "undo") && (args.all || args.campaigns.length > 0)) throw new UsageError(`--${args.mode} takes only a pre-image path`);

  return args;
}

const list = (items: string[]) => (items.length ? items.join(", ") : "none");

export function formatReport(r: MigrationReport): string {
  const lines = [`${r.name ?? "?"} ${r.campaignId} source=${r.sourceId ?? "-"} v=${r.version ?? "-"} status=${r.status}${r.detail ? ` (${r.detail})` : ""}`];

  const tables = Object.entries(r.tables);

  if (tables.length) {
    lines.push("table        stored  base-ref  override(upd/conf/own/orphan)  local  hide(+pending)");

    for (const [name, t] of tables) {
      if (!t) continue;

      const o = t.override;

      lines.push(`${name.padEnd(12)} ${String(t.stored).padEnd(7)} ${String(t.baseRef).padEnd(9)} ${`${o.updated + o.conflict + o.own + o.orphan} (${o.updated}/${o.conflict}/${o.own}/${o.orphan})`.padEnd(30)} ${String(t.local).padEnd(6)} ${t.hide} (+${t.hidePending})`);
    }
  }

  if (r.referrers.length) lines.push(`referrers: ${r.referrers.map((x) => `${x.model} ${x.rows} (changed ${x.changedRows}${Object.keys(x.cells).length ? `; ${Object.entries(x.cells).map(([c, n]) => `${c} ${n}`).join(", ")}` : ""})`).join(", ")}`);

  lines.push(`blockers: ${list(r.blockers.map((b) => JSON.stringify(b)))}`);

  if (r.residuals) {
    const fmt = (rows: Array<{ model: string; count: number }>) => list(rows.map((x) => `${x.model} ${x.count}`));

    lines.push(`history/composite: composite ${fmt(r.residuals.composite)}; history ${fmt(r.residuals.history)}`);
  }

  const warnings = new Map<string, number>();

  for (const w of r.warnings) warnings.set(w.code, (warnings.get(w.code) ?? 0) + (w.count ?? 1));

  lines.push(`warnings: ${list([...warnings].map(([code, n]) => (n > 1 ? `${code} x${n}` : code)))}`);

  return lines.join("\n");
}

const isFailure = (r: MigrationReport) => r.blockers.length > 0;

async function allLegacyCampaigns(): Promise<string[]> {
  const rows = await prisma.campaign.findMany({ where: { baseSourceId: null }, select: { id: true }, orderBy: { createdAt: "asc" } });

  return rows.map((c) => c.id);
}

async function dryRun(args: Args): Promise<number> {
  const ids = args.all ? await allLegacyCampaigns() : args.campaigns;

  const reports: MigrationReport[] = [];

  for (const id of ids) reports.push(await dryRunCampaign(prisma, id));

  if (args.all) {
    const groups = new Map<string, MigrationReport[]>();

    for (const r of reports) groups.set(r.status, [...(groups.get(r.status) ?? []), r]);

    for (const [status, group] of groups) {
      console.info(`\n== ${status} (${group.length}) ==`);

      for (const r of group) console.info(status === "eligible" ? formatReport(r) : `${r.name ?? "?"} ${r.campaignId}${r.detail ? ` (${r.detail})` : ""}`);
    }
  } else for (const r of reports) console.info(formatReport(r));

  if (args.json) await writeFile(args.json, JSON.stringify(reports, null, 2));

  return reports.some(isFailure) ? 1 : 0;
}

async function apply(args: Args): Promise<number> {
  await mkdir(PRE_IMAGE_DIR, { recursive: true });

  const report = await migrateCampaign(prisma as unknown as ExtendedPrisma, { campaignId: args.campaigns[0], preImageDir: PRE_IMAGE_DIR });

  console.info(formatReport(report));

  if (args.json) await writeFile(args.json, JSON.stringify(report, null, 2));

  if (report.status !== "migrated") return 1;

  console.info(`pre-image: ${report.preImagePath}`);
  console.info(WAIT_REMINDER);

  return 0;
}

async function verify(args: Args): Promise<number> {
  const result = await verifyFromPreImage(prisma, (args.preImage ?? ""));

  console.info(JSON.stringify(result, null, 2));

  return result.ok ? 0 : 1;
}

async function undo(args: Args): Promise<number> {
  const result = await undoMigration(prisma as unknown as ExtendedPrisma, (args.preImage ?? ""));

  if (result.ok) {
    console.info("undo: ok");
    console.info(WAIT_REMINDER);

    return 0;
  }

  console.error(`undo failed${result.reason ? ` (${result.reason})` : ""}`);

  for (const c of result.conflicts) console.error(`conflict: ${c.model} ${JSON.stringify(c.pk)} ${c.column}`);

  return 1;
}

const RUNNERS: Record<Mode, (args: Args) => Promise<number>> = { "dry-run": dryRun, apply, verify, undo };

async function main(): Promise<number> {
  let args: Args;

  try {
    args = parseArgs(process.argv.slice(2));
  } catch (e) {
    if (!(e instanceof UsageError)) throw e;

    console.error(`${e.message}\nusage: legacy-layers (--campaign <id> | --all) [--dry-run] [--json <file>] [--allow-remote]\n       legacy-layers --campaign <id> --apply | --verify <pre-image> | --undo <pre-image>`);

    return 2;
  }

  assertSeedTarget(process.env.DATABASE_URL, args.allowRemote);

  return RUNNERS[args.mode](args);
}

if (process.argv[1]?.endsWith("legacy-layers.ts")) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((e) => {
      console.error(e instanceof Error && "details" in e ? `${e.name}: ${e.message} ${JSON.stringify((e as { details: unknown }).details)}` : e);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
