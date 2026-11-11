import * as path from "path";

import { GRIM_DATA_DIR, GRIM_ROW_KINDS, type GrimData } from "./data";
import { GRIM_SPELL_LISTS } from "./spells";

import type { TranslationsV2 } from "@/lib/utils/templates/i18n/keys";
import { extractKeyed, type KeyedString, rulesKeyed } from "@/lib/utils/templates/i18n/keys";
import { translateAt,translatedNames } from "@/lib/utils/templates/i18n/overlay";
import { slugify } from "@/lib/utils/templates/slug";

export const GRIM_I18N_DIR = path.join(GRIM_DATA_DIR, "i18n");

export const GRIM_CATALOG_KINDS = [...GRIM_ROW_KINDS, "spellLists"] as const;

type CatalogRows = Record<(typeof GRIM_CATALOG_KINDS)[number], { slug: string; name?: unknown }[]>;

const spellListNames = (data: GrimData) => [...new Set(data.spells.flatMap((row) => (Array.isArray(row.lists) ? row.lists : [])).filter((name): name is string => typeof name === "string"))];

export function grimCatalogData(data: GrimData): CatalogRows {
  return {
    ...(data as unknown as CatalogRows),
    careers: data.careers.map((row) => ({
      slug: String(row.slug),
      name: row.name,
      class: row.class,
      tiers: [1, 2, 3, 4].map((n) => ({ name: row[`tier${n}_name`], trappings: row[`tier${n}_trappings`] ?? [] })),
    })),
    spellLists: spellListNames(data).map((name) => ({ slug: slugify(name), name })),
  };
}

export const grimCatalog = (data: GrimData): KeyedString[] => [...extractKeyed(grimCatalogData(data), GRIM_CATALOG_KINDS), ...rulesKeyed(data.rules)];

export function grimI18nIssues(data: GrimData, tr: TranslationsV2): string[] {
  const issues: string[] = [];

  const rows = grimCatalogData(data);

  const scopes: Array<[string, string]> = [...GRIM_ROW_KINDS.map((kind): [string, string] => [kind, kind]), ["spell lists", "spellLists"]];

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
