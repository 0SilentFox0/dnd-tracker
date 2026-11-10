import * as path from "path";

import { GRIM_DATA_DIR, GRIM_ROW_KINDS, type GrimData } from "./data";
import { GRIM_SPELL_LISTS } from "./spells";

import { type CatalogEntry, extractCatalog, type Translations } from "@/lib/srd/i18n/catalog";
import { translatedNames, translateText } from "@/lib/srd/i18n/overlay";

export const GRIM_I18N_DIR = path.join(GRIM_DATA_DIR, "i18n");

export const GRIM_CATALOG_KINDS = [...GRIM_ROW_KINDS, "spellLists", "rules"] as const;

const spellListNames = (data: GrimData) => [...new Set(data.spells.flatMap((row) => (Array.isArray(row.lists) ? row.lists : [])).filter((name): name is string => typeof name === "string"))];

export function grimCatalogData(data: GrimData): Record<(typeof GRIM_CATALOG_KINDS)[number], unknown[]> {
  return {
    ...data,
    careers: data.careers.map((row) => ({
      name: row.name,
      class: row.class,
      tiers: [1, 2, 3, 4].map((n) => ({ name: row[`tier${n}_name`], trappings: row[`tier${n}_trappings`] ?? [] })),
    })),
    spellLists: spellListNames(data).map((name) => ({ name })),
    rules: data.rules?.tables ? [data.rules.tables] : [],
  };
}

export const grimCatalog = (data: GrimData): CatalogEntry[] => extractCatalog(grimCatalogData(data), GRIM_CATALOG_KINDS);

export function grimI18nIssues(data: GrimData, tr: Translations): string[] {
  const issues: string[] = [];

  const scopes: Array<[string, unknown[]]> = [...GRIM_ROW_KINDS.map((kind): [string, unknown[]] => [kind, grimCatalogData(data)[kind]]), ["spell lists", grimCatalogData(data).spellLists]];

  for (const [scope, rows] of scopes) {
    try {
      translatedNames(rows, tr, scope);
    } catch (error) {
      issues.push(error instanceof Error ? error.message : String(error));
    }
  }

  const known = new Set(Object.values(GRIM_SPELL_LISTS).flat().map((name) => translateText(tr, "name", name)));

  for (const row of data.spells) {
    for (const list of Array.isArray(row.lists) ? row.lists : []) {
      if (typeof list === "string" && !known.has(translateText(tr, "name", list))) issues.push(`spells "${String(row.name)}": list "${list}" does not resolve after translation`);
    }
  }

  return issues;
}
