import type { IconKind, IconsFile } from "../../assets/tokens-5e/icons-file";
import { toImportRows } from "./data-files";
import { type SpellRow, SRD_KINDS, type SrdData, type SrdKind } from "./types";

import { SRD_TEMPLATE_NAME } from "@/lib/constants/campaigns";
import { translateIssue } from "@/lib/i18n/translate-issue";
import type { Translator } from "@/lib/i18n/translator";
import type { ImportKind, ImportReport } from "@/types/content-import";

export { SRD_TEMPLATE_NAME };

export interface SrdSeedArgs {
  locale: "en";
  owner?: string;
  allowRemote: boolean;
}

/** Validate before loading any database-backed seeding code. */
export function parseSrdSeedArgs(args: string[]): SrdSeedArgs {
  for (const [index, arg] of args.entries()) {
    if (arg === "--locale" && args[index + 1] !== "en") throw new Error("SRD seeding supports English only (--locale en); select the content language when cloning a campaign.");
  }

  const ownerIndex = args.indexOf("--owner");

  const owner = ownerIndex < 0 ? undefined : args[ownerIndex + 1];

  if (ownerIndex >= 0 && (!owner || owner.startsWith("--"))) throw new Error("Вкажіть --owner <userId>");

  return { locale: "en", owner, allowRemote: args.includes("--allow-remote") };
}

export const SRD_TEMPLATE_DESCRIPTION = "System Reference Document 5.2 (CC-BY-4.0): заклинання, монстри, зброя, раси й класи; правила 5e";

export type RunImport<K extends ImportKind = SrdKind> = (kind: K, rows: Record<string, unknown>[]) => Promise<ImportReport>;

export type SrdImportResult<K extends ImportKind = SrdKind> = { kind: K; report: ImportReport };

export const CLEARABLE_SPELL_COLUMNS = ["dieSides", "upcastDice", "upcastTargets", "addAbilityMod", "fixedDice", "damageBonus"] as const;

// the import treats null as an empty cell and keeps the old value, so a rerun clears dropped optional columns itself
export function staleSpellColumns(spells: SpellRow[]): Array<{ column: (typeof CLEARABLE_SPELL_COLUMNS)[number]; names: string[] }> {
  return CLEARABLE_SPELL_COLUMNS.map((column) => ({ column, names: spells.filter((s) => s[column] === undefined).map((s) => s.name) })).filter((c) => c.names.length > 0);
}

// the engine compares damageBonus/flag schools with spell group ids; data files keep portable names
export function resolveSchoolRefs<T>(value: T, idByName: ReadonlyMap<string, string>): T {
  if (Array.isArray(value)) return value.map((v) => resolveSchoolRefs(v, idByName)) as T;

  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, k === "school" && typeof v === "string" ? (idByName.get(v) ?? v) : resolveSchoolRefs(v, idByName)])) as T;
}

const ICON_COLUMN: Partial<Record<SrdKind, "icon" | "avatar">> = { spells: "icon", artifacts: "icon", units: "avatar", races: "icon", classes: "icon", backgrounds: "icon", feats: "icon" };

export function withIcons(kind: SrdKind, data: SrdData, rows: Record<string, unknown>[], icons: IconsFile): Record<string, unknown>[] {
  const column = ICON_COLUMN[kind];

  if (!column) return rows;

  const urls = icons[kind as IconKind];

  const source = data[kind] as ReadonlyArray<{ slug: string }>;

  if (source.length !== rows.length) throw new Error(`withIcons(${kind}): ${rows.length} рядків проти ${source.length} записів даних`);

  return rows.map((row, i) => {
    const url = urls[source[i].slug];

    return url ? { ...row, [column]: url } : row;
  });
}

type FeatureGroupRow = { abilities?: Array<Record<string, unknown> & { id?: string }> };

const iconAbilities = (groups: unknown, scope: string, urls: Record<string, string>) =>
  Array.isArray(groups)
    ? groups.map((g: FeatureGroupRow) => ({ ...g, abilities: g.abilities?.map((a) => (a.id && urls[`${scope}/${a.id}`] ? { ...a, icon: urls[`${scope}/${a.id}`] } : a)) }))
    : groups;

export function withClassIcons(rows: Record<string, unknown>[], data: SrdData, icons: IconsFile): Record<string, unknown>[] {
  if (data.classes.length !== rows.length) throw new Error(`withClassIcons: ${rows.length} рядків проти ${data.classes.length} записів даних`);

  return rows.map((row, i) => {
    const slug = data.classes[i].slug;

    const subclasses = Array.isArray(row.subclasses)
      ? row.subclasses.map((s: Record<string, unknown> & { id?: string }) => {
          const scope = `${slug}/${s.id}`;

          const icon = icons.subclasses[scope];

          return { ...s, features: iconAbilities(s.features, scope, icons.features), ...(icon ? { icon } : {}) };
        })
      : row.subclasses;

    return { ...row, features: iconAbilities(row.features, slug, icons.features), subclasses };
  });
}

export type PrepareRows<K extends ImportKind = SrdKind> = (kind: K, rows: Record<string, unknown>[]) => Promise<Record<string, unknown>[]>;

export async function importSrdData<K extends ImportKind = SrdKind>(
  data: Record<K, ReadonlyArray<object>>,
  run: RunImport<K>,
  prepare?: PrepareRows<K>,
  kinds: readonly K[] = SRD_KINDS as unknown as readonly K[],
): Promise<SrdImportResult<K>[]> {
  const results: SrdImportResult<K>[] = [];

  for (const kind of kinds) {
    const rows = toImportRows(data[kind] as ReadonlyArray<{ slug: string }>);

    results.push({ kind, report: await run(kind, prepare ? await prepare(kind, rows) : rows) });
  }

  return results;
}

export const hasRowErrors = (results: SrdImportResult<ImportKind>[]) => results.some((r) => r.report.counts.error > 0);

export function formatImportSummary(results: SrdImportResult<ImportKind>[], t?: Translator): string[] {
  return results.flatMap(({ kind, report: { counts, results: rows } }) => [
    `${kind}: created ${counts.created}, updated ${counts.updated}, skipped ${counts.skipped}, error ${counts.error}`,
    ...rows
      .filter((r) => r.status === "error")
      .slice(0, 10)
      .map((r) => `  #${r.row} ${r.name ?? "?"}: ${r.issues.filter((i) => i.level === "error").map((i) => (t ? translateIssue(t, i) : i.message)).join("; ")}`),
  ]);
}
