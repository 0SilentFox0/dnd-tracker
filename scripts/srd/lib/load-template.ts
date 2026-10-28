import type { TokenKind } from "../../assets/tokens-5e/catalog";
import type { IconsFile } from "../../assets/tokens-5e/icons-file";
import { toImportRows } from "./data-files";
import { type SpellRow, SRD_KINDS, type SrdData, type SrdKind } from "./types";

import { SRD_TEMPLATE_NAME } from "@/lib/constants/campaigns";
import { translateIssue } from "@/lib/i18n/translate-issue";
import type { Translator } from "@/lib/i18n/translator";
import type { Ruleset } from "@/lib/utils/rules/schema";
import type { ImportReport } from "@/types/content-import";

export { SRD_TEMPLATE_NAME };

export const SRD_TEMPLATE_DESCRIPTION = "System Reference Document 5.2 (CC-BY-4.0): заклинання, монстри, зброя, раси й класи; правила 5e";

export interface TemplateStore {
  findTemplate(): Promise<{ id: string; dmUserId: string } | null>;
  findOfficialOwner(): Promise<string | null>;
  create(input: { userId: string; rules: Ruleset; credits: string }): Promise<{ id: string; dmUserId: string }>;
  update(id: string, data: { rules: Ruleset; credits: string; description: string }): Promise<void>;
}

export async function ensureSrdTemplate(store: TemplateStore, opts: { owner?: string; rules: Ruleset; credits: string }): Promise<{ id: string; dmUserId: string; created: boolean }> {
  const existing = await store.findTemplate();

  if (existing) {
    await store.update(existing.id, { rules: opts.rules, credits: opts.credits, description: SRD_TEMPLATE_DESCRIPTION });

    return { ...existing, created: false };
  }

  const userId = opts.owner ?? (await store.findOfficialOwner());

  if (!userId) throw new Error("Немає власника шаблону: передайте --owner <userId> (офіційних шаблонів ще немає)");

  return { ...(await store.create({ userId, rules: opts.rules, credits: opts.credits })), created: true };
}

export type RunImport = (kind: SrdKind, rows: Record<string, unknown>[]) => Promise<ImportReport>;

export type SrdImportResult = { kind: SrdKind; report: ImportReport };

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

const ICON_COLUMN: Partial<Record<SrdKind, "icon" | "avatar">> = { spells: "icon", artifacts: "icon", units: "avatar" };

export function withIcons(kind: SrdKind, data: SrdData, rows: Record<string, unknown>[], icons: IconsFile): Record<string, unknown>[] {
  const column = ICON_COLUMN[kind];

  if (!column) return rows;

  const urls = icons[kind as TokenKind];

  const source = data[kind] as ReadonlyArray<{ slug: string }>;

  if (source.length !== rows.length) throw new Error(`withIcons(${kind}): ${rows.length} рядків проти ${source.length} записів даних`);

  return rows.map((row, i) => {
    const url = urls[source[i].slug];

    return url ? { ...row, [column]: url } : row;
  });
}

export type PrepareRows = (kind: SrdKind, rows: Record<string, unknown>[]) => Promise<Record<string, unknown>[]>;

export async function importSrdData(data: SrdData, run: RunImport, prepare?: PrepareRows): Promise<SrdImportResult[]> {
  const results: SrdImportResult[] = [];

  for (const kind of SRD_KINDS) {
    const rows = toImportRows(data[kind]);

    results.push({ kind, report: await run(kind, prepare ? await prepare(kind, rows) : rows) });
  }

  return results;
}

export const hasRowErrors = (results: SrdImportResult[]) => results.some((r) => r.report.counts.error > 0);

export function formatImportSummary(results: SrdImportResult[], t?: Translator): string[] {
  return results.flatMap(({ kind, report: { counts, results: rows } }) => [
    `${kind}: created ${counts.created}, updated ${counts.updated}, skipped ${counts.skipped}, error ${counts.error}`,
    ...rows
      .filter((r) => r.status === "error")
      .slice(0, 10)
      .map((r) => `  #${r.row} ${r.name ?? "?"}: ${r.issues.filter((i) => i.level === "error").map((i) => (t ? translateIssue(t, i) : i.message)).join("; ")}`),
  ]);
}
