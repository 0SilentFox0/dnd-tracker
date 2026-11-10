import type { Bundle } from "./bundle";

import { mapStrings, type Translations } from "@/lib/srd/i18n/catalog";
import { attackNames, translatedNames, translateText } from "@/lib/srd/i18n/overlay";
import { isRecord } from "@/lib/utils/common/is-record";

const TABLES = ["spellGroups", "spells", "races", "classes", "feats", "backgrounds", "units", "artifacts", "careers"] as const;

/** Open only the recognized artifact record; never parse it through a stripping schema. */
function localizeModifier(record: unknown, tr: Translations, bases: Map<string, string>): unknown {
  if (!isRecord(record) || typeof record.value !== "string") return record;

  if (record.type === "properties") {
    const value = translateText(tr, "properties", record.value, "weapon");

    return value === record.value ? record : { ...record, value };
  }

  if (record.type !== "itemStats") return record;

  let parsed: unknown;

  try { parsed = JSON.parse(record.value); } catch { return record; }

  if (!isRecord(parsed)) return record;

  const localized = mapStrings(parsed, (key, text, parent, path) => {
    const field = path.join(".");

    if (field === "property.appliesTo.bases") return bases.get(text.trim().toLowerCase()) ?? text;

    if (field === "property.nameTemplate" || field === "parameter.options.label") return translateText(tr, key, text, parent, path);

    return text;
  });

  return JSON.stringify(localized) === JSON.stringify(parsed) ? record : { ...record, value: JSON.stringify(localized) };
}

export function localizeRules(rules: unknown, tr: Translations): unknown {
  if (!isRecord(rules) || !isRecord(rules.tables)) return rules;

  const tables = mapStrings(rules.tables, (key, text, parent, path) => translateText(tr, key, text, parent, path));

  return JSON.stringify(tables) === JSON.stringify(rules.tables) ? rules : { ...rules, tables };
}

/** Localize canonical template DB rows (SRD, Grim); source/language policy belongs to the caller. */
export function localizeTemplateBundle(bundle: Bundle, translations: Translations): Bundle {
  if (!Object.keys(translations).length) return bundle;

  const maps = Object.fromEntries(TABLES.map((table) => [table, translatedNames(bundle[table], translations, table, table === "artifacts" ? (name) => name.trim().toLowerCase() : undefined)])) as Record<(typeof TABLES)[number], Map<string, string>>;

  // Templates without classes (Grim) list spells under free-form list names.
  if (bundle.classes.length === 0) maps.classes = translatedNames([...new Set(bundle.spells.flatMap((spell) => (Array.isArray(spell.lists) ? spell.lists : [])))].filter((name): name is string => typeof name === "string").map((name) => ({ name })), translations, "spell lists");

  const attacks = bundle.units.map((row) => attackNames(row, translations));

  const out = { ...bundle };

  for (const table of TABLES) {
    out[table] = bundle[table].map((row, index) => {
      // Modifiers are opaque outside the two explicitly recognized record types.
      const { modifiers, ...fields } = row;

      const textFields = table === "artifacts" ? fields : row;

      const localized = mapStrings(textFields, (key, text, parent, path) => {
        if (table === "units" && key === "attack" && parent === "perform") return attacks[index].get(text.toLowerCase()) ?? text;

        if ((table === "classes" && path.join(".") === "spellList") ||
          (key === "lists" && ((table === "spells" && path.length === 1) || (parent === "spells" && path.includes("choices"))))) return maps.classes.get(text) ?? text;

        // DB spellId/groupId/originFeatId/school are identifiers, never seed names.
        return translateText(translations, key, text, parent, path);
      }) as typeof row;

      if (table === "artifacts" && "modifiers" in row) localized.modifiers = Array.isArray(modifiers) ? modifiers.map((record) => localizeModifier(record, translations, maps.artifacts)) : modifiers;

      return localized;
    });
  }

  return { ...out, rules: localizeRules(bundle.rules, translations) };
}
