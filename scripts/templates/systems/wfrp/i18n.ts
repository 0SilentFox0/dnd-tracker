import type { Pack } from "../../lib/pack";
import { type Row, WFRP_ROW_KINDS, type WfrpData, wfrpDataOf } from "./common";
import { GRIM_SPELL_LISTS } from "./spells";

import type { TranslationsV2 } from "@/lib/utils/templates/i18n/keys";
import { translateAt, translatedNames } from "@/lib/utils/templates/i18n/overlay";
import { slugify } from "@/lib/utils/templates/slug";

export const WFRP_CATALOG_KINDS = [...WFRP_ROW_KINDS, "spellLists"] as const;

type CatalogRows = Record<(typeof WFRP_CATALOG_KINDS)[number], { slug: string; name?: unknown }[]>;

const spellListNames = (data: WfrpData) => [...new Set(data.spells.flatMap((row) => (Array.isArray(row.lists) ? row.lists : [])).filter((name): name is string => typeof name === "string"))];

function catalogRows(data: WfrpData): CatalogRows {
  return {
    ...(Object.fromEntries(WFRP_ROW_KINDS.map((kind) => [kind, data[kind]])) as unknown as CatalogRows),
    careers: data.careers.map((row: Row) => ({
      slug: String(row.slug),
      name: row.name,
      class: row.class,
      tiers: [1, 2, 3, 4].map((n) => ({ name: row[`tier${n}_name`], trappings: row[`tier${n}_trappings`] ?? [] })),
    })),
    spellLists: spellListNames(data).map((name) => ({ slug: slugify(name), name })),
  };
}

export const wfrpI18nRows = (pack: Pack): CatalogRows => catalogRows(wfrpDataOf(pack));

export function wfrpI18nIssues(pack: Pack, tr: TranslationsV2): string[] {
  const data = wfrpDataOf(pack);

  const issues: string[] = [];

  const rows = catalogRows(data);

  const scopes: Array<[string, string]> = [...WFRP_ROW_KINDS.map((kind): [string, string] => [kind, kind]), ["spell lists", "spellLists"]];

  for (const [scope, kind] of scopes) {
    try {
      translatedNames(rows[kind as keyof CatalogRows], kind, tr, scope);
    } catch (error) {
      issues.push(error instanceof Error ? error.message : String(error));
    }
  }

  const known = new Set(Object.values(GRIM_SPELL_LISTS).flat().map((name) => translateAt(tr, `spellLists/${slugify(name)}/name`, name)));

  for (const row of data.spells) {
    for (const list of Array.isArray(row.lists) ? row.lists : []) {
      if (typeof list === "string" && !known.has(translateAt(tr, `spellLists/${slugify(list)}/name`, list))) issues.push(`spells "${String(row.name)}": list "${list}" does not resolve after translation`);
    }
  }

  return issues;
}
