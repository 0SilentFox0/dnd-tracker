import { isDeepStrictEqual } from "node:util";

import { assertSeedTarget } from "../../seed/seed-library-lib";
import { PACK_HOOKS, type PackHooks } from "../systems";
import { catalogOfPack } from "./i18n-convert";
import { readTranslations } from "./i18n-store";
import { withIcons } from "./icons-file";
import { importOrder } from "./import-order";
import { iconColumnOf, resolveSchoolRefs, staleSpellColumns, withClassIcons } from "./import-prepare";
import { type Pack, type PackRow, readPack, TEMPLATES_DIR } from "./pack";
import { ensureTemplate, makeTemplateStore } from "./store";
import { validatePack } from "./validate";

import { prisma } from "@/lib/db";
import { translateIssue } from "@/lib/i18n/translate-issue";
import { getTranslator } from "@/lib/i18n/translator";
import { importContent, OFFLINE_IMPORT_DEPS } from "@/lib/server/content/import/import-content";
import { loadKeys } from "@/lib/server/content/import/slug";
import { withCampaignContentWrite } from "@/lib/server/content/write";
import { markContentDirty } from "@/lib/server/content/write-context";
import { type BundleTableDef, tableOfKind } from "@/lib/server/templates/bundle";
import { type PublishResult } from "@/lib/server/templates/publish";
import { publishTemplate } from "@/lib/server/templates/publish-service";
import { rowHash } from "@/lib/server/templates/sync/hash";
import type { Actor } from "@/lib/utils/api/actor";
import { isImportKind } from "@/lib/utils/content/import";
import { RulesetSchema } from "@/lib/utils/rules/schema";
import { statusOf } from "@/lib/utils/templates/i18n/keys";
import type { PackKind } from "@/lib/utils/templates/manifest";
import type { ImportKind, ImportReport } from "@/types/content-import";

export interface KindCounts { created: number; updated: number; skipped: number; errors: number }

export interface ImportPackResult { templateId: string | null; created: boolean; perKind: Record<string, KindCounts>; published?: PublishResult }

export interface ImportPackOptions { owner?: string; dryRun?: boolean; allowRemote?: boolean; dir?: string; publish?: boolean; allowUntranslated?: boolean }

const counts = (created = 0, updated = 0, skipped = 0, errors = 0): KindCounts => ({ created, updated, skipped, errors });

const fromReport = ({ counts: c }: ImportReport): KindCounts => counts(c.created, c.updated, c.skipped, c.error);

function describeReport(kind: string, report: ImportReport, t: Awaited<ReturnType<typeof getTranslator>>): string[] {
  const { counts: c, results } = report;

  return [
    `${kind}: created ${c.created}, updated ${c.updated}, skipped ${c.skipped}, error ${c.error}`,
    ...results.filter((r) => r.status === "error").slice(0, 10).map((r) => `  #${r.row} ${r.name ?? "?"}: ${r.issues.filter((i) => i.level === "error").map((i) => translateIssue(t, i)).join("; ")}`),
  ];
}

type Delegate = { findFirst(args: unknown): Promise<(Record<string, unknown> & { id: string }) | null>; create(args: unknown): Promise<unknown>; update(args: unknown): Promise<unknown> };

const delegateFor = (db: unknown, kind: PackKind): { table: BundleTableDef; delegate: Delegate } => {
  const table = tableOfKind(kind);

  if (!table) throw new Error(`No table is registered for kind "${kind}"`);

  return { table, delegate: (db as Record<string, Delegate>)[table.delegate] };
};

/** Kinds without a name column: an unslugged row of the template is matched by this column. */
const MATCH_COLUMN: Partial<Record<PackKind, string>> = { skillTrees: "race", tracks: "title" };

interface UpsertContext { hooks: PackHooks | undefined; idBySlug: Record<string, Record<string, string>>; dryRun: boolean }

/** Rows of a kind the importer does not know (skillTrees, tracks): match by slug (else by the match column), keep the id, write the columns as they are. */
async function upsertBySlug(campaignId: string, kind: PackKind, rows: PackRow[], { hooks, idBySlug, dryRun }: UpsertContext): Promise<KindCounts> {
  const result = counts();

  const matchColumn = MATCH_COLUMN[kind];

  const run = async (db: unknown) => {
    const { table, delegate } = delegateFor(db, kind);

    for (const { origin: _origin, extra: _extra, ...row } of rows) {
      const existing = (await delegate.findFirst({ where: { campaignId, slug: row.slug } })) ?? (matchColumn ? await delegate.findFirst({ where: { campaignId, slug: null, [matchColumn]: row[matchColumn] } }) : null);

      const data = hooks?.fromPackRow ? hooks.fromPackRow(kind, row, { idOf: (k, slug) => idBySlug[k]?.[slug], slugOf: () => undefined, rowId: existing?.id }) : row;

      const unchanged = existing && rowHash(existing, table) === rowHash({ ...existing, ...data }, table);

      if (unchanged) {
        result.skipped += 1;

        if (existing.slug !== data.slug && !dryRun) await delegate.update({ where: { id: existing.id }, data: { slug: data.slug } });

        continue;
      }

      if (existing) result.updated += 1;
      else result.created += 1;

      if (dryRun) continue;

      markContentDirty();

      if (existing) await delegate.update({ where: { id: existing.id }, data });
      else await delegate.create({ data: { ...data, campaignId } });
    }
  };

  if (dryRun) await run(prisma);
  else await withCampaignContentWrite(campaignId, run, { bump: false });

  return result;
}

/** Columns outside the import specs travel in `extra`; written by slug after the importer, a changed value counts as a content change. */
async function writeExtras(campaignId: string, kind: PackKind, rows: PackRow[]): Promise<void> {
  const withExtra = rows.filter((row) => row.extra && Object.keys(row.extra).length > 0);

  if (withExtra.length === 0) return;

  await withCampaignContentWrite(
    campaignId,
    async (db) => {
      const { delegate } = delegateFor(db, kind);

      for (const { slug, extra = {} } of withExtra) {
        const existing = await delegate.findFirst({ where: { campaignId, slug } });

        if (existing && Object.entries(extra).some(([column, value]) => !isDeepStrictEqual(existing[column], value))) {
          markContentDirty();
          await delegate.update({ where: { id: existing.id }, data: extra });
        }
      }
    },
    { bump: false },
  );
}

const translationGaps = (pack: Pack, dir: string): string[] => {
  const catalog = catalogOfPack(pack);

  return pack.manifest.locales.filter((locale) => locale !== "en").flatMap((locale) => {
    const status = statusOf(catalog, readTranslations(pack.manifest.key, locale, dir));

    return status.stale.length + status.missing.length > 0 ? [`${locale}: stale ${status.stale.length}, missing ${status.missing.length}`] : [];
  });
};

async function idsBySlug(campaignId: string, kinds: readonly PackKind[]): Promise<Record<string, Record<string, string>>> {
  const entries = await Promise.all(kinds.filter(isImportKind).map(async (kind) => [kind, Object.fromEntries((await loadKeys(campaignId, kind)).flatMap((row) => (row.slug ? [[row.slug, row.id]] : [])))] as const));

  return Object.fromEntries(entries);
}

export async function importPack(key: string, opts: ImportPackOptions = {}): Promise<ImportPackResult> {
  const { dir = TEMPLATES_DIR, dryRun = false } = opts;

  assertSeedTarget(process.env.DATABASE_URL, opts.allowRemote ?? false);

  const pack = readPack(key, dir);

  const { manifest } = pack;

  const errors = validatePack(pack, { dir }).filter((issue) => issue.level === "error");

  if (errors.length > 0) throw new Error(`Pack "${key}" is invalid:\n${errors.map((issue) => `  ${issue.message}`).join("\n")}`);

  const store = makeTemplateStore(manifest);

  const t = await getTranslator("uk");

  const existing = await store.findTemplate();

  if (dryRun && !existing) return { templateId: null, created: true, perKind: Object.fromEntries(manifest.kinds.map((kind) => [kind, counts(pack.rows[kind]?.length ?? 0)])) };

  const template = dryRun && existing ? { id: existing.id, dmUserId: existing.dmUserId, created: false } : await ensureTemplate(store, { owner: opts.owner, rules: RulesetSchema.parse(pack.rules), credits: manifest.credits ?? "" });

  console.info(`${manifest.names.en}: ${template.id}${template.created ? " (created)" : ""}${dryRun ? " (dry run)" : ""}`);

  const actor: Actor = { campaignId: template.id, userId: template.dmUserId, isDM: true, via: "session", scopes: null };

  const run = (kind: ImportKind, rows: PackRow[]) => importContent(actor, kind, { rows, mode: "update", dryRun }, OFFLINE_IMPORT_DEPS);

  const schoolIds = async () => new Map((await prisma.spellGroup.findMany({ where: { campaignId: template.id }, select: { id: true, name: true } })).map((g) => [g.name, g.id]));

  const hasSets = manifest.kinds.includes("artifact-sets") && manifest.kinds.includes("artifacts");

  const prepare = async (kind: PackKind, rows: PackRow[]): Promise<PackRow[]> => {
    const iconed = withIcons(rows.map(({ extra: _extra, ...row }) => row), pack.icons[kind], iconColumnOf(kind));

    const classed = kind === "classes" ? withClassIcons(iconed, pack.icons) : iconed;

    return kind !== "spell-groups" && manifest.kinds.includes("spell-groups") ? resolveSchoolRefs(classed, await schoolIds()) : classed;
  };

  const perKind: Record<string, KindCounts> = {};

  const hooks = Object.hasOwn(PACK_HOOKS, manifest.system) ? PACK_HOOKS[manifest.system] : undefined;

  for (const kind of importOrder(manifest.kinds)) {
    const rows = pack.rows[kind] ?? [];

    if (!isImportKind(kind)) {
      perKind[kind] = await upsertBySlug(template.id, kind, rows, { hooks, idBySlug: await idsBySlug(template.id, manifest.kinds), dryRun });
      continue;
    }

    const prepared = await prepare(kind, rows);

    const first = hasSets && kind === "artifacts" ? prepared.map(({ setId: _setId, ...rest }) => rest) : prepared;

    const report = await run(kind, first);

    for (const line of describeReport(kind, report, t)) console.info(line);

    perKind[kind] = fromReport(report);

    if (!dryRun && report.counts.error === 0) await writeExtras(template.id, kind, rows);

    if (hasSets && kind === "artifact-sets") {
      const linked = (await prepare("artifacts", pack.rows.artifacts ?? [])).filter((row) => row.setId);

      const second = await run("artifacts", linked);

      for (const line of describeReport("artifacts (setId)", second, t)) console.info(line);

      perKind.artifacts = { ...perKind.artifacts, errors: perKind.artifacts.errors + second.counts.error };
    }

    if (!dryRun && kind === "spells") for (const { column, names } of staleSpellColumns(rows)) await prisma.spell.updateMany({ where: { campaignId: template.id, name: { in: names } }, data: { [column]: null } });
  }

  const failed = Object.values(perKind).some((c) => c.errors > 0);

  if (!dryRun && !failed) await hooks?.afterImport?.({ pack, templateId: template.id, idBySlug: await idsBySlug(template.id, manifest.kinds) });

  if (dryRun || failed || !opts.publish) return { templateId: template.id, created: template.created, perKind };

  const gaps = translationGaps(pack, dir);

  if (gaps.length > 0 && !opts.allowUntranslated) throw new Error(`Refusing to publish "${key}": translations are incomplete (${gaps.join("; ")}); run \`pnpm template i18n status ${key} <locale>\``);

  const published = await publishTemplate(actor);

  console.info(`Version ${published.version}: +${published.added} ~${published.changed} -${published.removed}`);

  return { templateId: template.id, created: template.created, perKind, published };
}

export async function publishPack(key: string, opts: { allowRemote?: boolean; dir?: string; allowUntranslated?: boolean } = {}): Promise<{ contentVersion: number; changedRows: number }> {
  assertSeedTarget(process.env.DATABASE_URL, opts.allowRemote ?? false);

  const dir = opts.dir ?? TEMPLATES_DIR;

  const pack = readPack(key, dir);

  const gaps = translationGaps(pack, dir);

  if (gaps.length > 0 && !opts.allowUntranslated) throw new Error(`Refusing to publish "${key}": translations are incomplete (${gaps.join("; ")}); run \`pnpm template i18n status ${key} <locale>\``);

  const template = await makeTemplateStore(pack.manifest).findTemplate();

  if (!template) throw new Error(`No official template for "${key}" in the database; run \`pnpm template import ${key}\` first`);

  const published = await publishTemplate({ campaignId: template.id, userId: template.dmUserId, isDM: true, via: "session", scopes: null });

  return { contentVersion: published.version, changedRows: published.added + published.changed + published.removed };
}
