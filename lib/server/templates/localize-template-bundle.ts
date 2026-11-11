import type { Bundle, BundleTable } from "./bundle";

import { CONTENT_KINDS, type ContentKind } from "@/lib/constants/content-kinds";
import { tableKey } from "@/lib/server/assistant/actions/content-dependencies";
import { isRecord } from "@/lib/utils/common/is-record";
import { classOf, isTranslatable } from "@/lib/utils/templates/i18n/catalog";
import { mapKeyed, safeSlug, type TranslationsV2 } from "@/lib/utils/templates/i18n/keys";
import { attackNames, translateAt,translatedNames } from "@/lib/utils/templates/i18n/overlay";

const KIND_OF = Object.fromEntries(CONTENT_KINDS.map((kind) => [tableKey(kind), kind])) as Record<string, ContentKind>;

type Table = BundleTable;

const TABLES = Object.keys(KIND_OF) as Table[];

const translatable = (key: string, parent: string, path: readonly string[], text: string) => classOf(key, parent, path) !== null && isTranslatable(text);

/** Open only the recognized artifact record; never parse it through a stripping schema. */
function localizeModifier(record: unknown, tr: TranslationsV2, bases: Map<string, string>, slug: string): unknown {
  if (!isRecord(record) || typeof record.value !== "string") return record;

  if (record.type === "properties") {
    const value = translateAt(tr, `artifacts/${slug}/weapon.properties`, record.value);

    return value === record.value ? record : { ...record, value };
  }

  if (record.type !== "itemStats") return record;

  let parsed: unknown;

  try { parsed = JSON.parse(record.value); } catch { return record; }

  if (!isRecord(parsed)) return record;

  const localized = mapKeyed(parsed, ({ fieldPath, key, parent, path, text }) => {
    const field = path.join(".");

    if (field === "property.appliesTo.bases") return bases.get(text.trim().toLowerCase()) ?? text;

    if ((field === "property.nameTemplate" || field === "parameter.options.label") && translatable(key, parent, path, text)) return translateAt(tr, `artifacts/${slug}/${fieldPath}`, text);

    return text;
  }, "item");

  return JSON.stringify(localized) === JSON.stringify(parsed) ? record : { ...record, value: JSON.stringify(localized) };
}

export function localizeRules(rules: unknown, tr: TranslationsV2): unknown {
  if (!isRecord(rules) || !isRecord(rules.tables)) return rules;

  const tables = mapKeyed(rules.tables, ({ fieldPath, key, parent, path, text }) => (translatable(key, parent, path, text) ? translateAt(tr, `rules/_/${fieldPath}`, text) : text));

  return JSON.stringify(tables) === JSON.stringify(rules.tables) ? rules : { ...rules, tables };
}

const slugOf = (row: Record<string, unknown>): string | null => (typeof row.slug === "string" && row.slug ? row.slug : null);

/** Localize canonical template DB rows (SRD, Grim); source/language policy belongs to the caller. A row without a slug stays English. */
export function localizeTemplateBundle(bundle: Bundle, translations: TranslationsV2): Bundle {
  if (!Object.keys(translations).length) return bundle;

  const maps = Object.fromEntries(TABLES.map((table) => [table, translatedNames(bundle[table], KIND_OF[table], translations, table, table === "artifacts" ? (name) => name.trim().toLowerCase() : undefined)])) as Record<Table, Map<string, string>>;

  // Templates without classes (Grim) list spells under free-form list names.
  if (bundle.classes.length === 0) {
    const lists = [...new Set(bundle.spells.flatMap((spell) => (Array.isArray(spell.lists) ? spell.lists : [])))].filter((name): name is string => typeof name === "string").map((name) => ({ name, slug: safeSlug(name) }));

    maps.classes = translatedNames(lists, "spellLists", translations, "spell lists");
  }

  const attacks = bundle.units.map((row) => attackNames(row, "units", translations));

  const out = { ...bundle };

  for (const table of TABLES) {
    out[table] = bundle[table].map((row, index) => {
      const slug = slugOf(row);

      if (!slug) return row;

      const kind = KIND_OF[table];

      // Modifiers are opaque outside the two explicitly recognized record types.
      const { modifiers, ...fields } = row;

      const textFields = table === "artifacts" ? fields : row;

      const localized = mapKeyed(textFields, ({ fieldPath, key, parent, path, text }) => {
        if (table === "units" && key === "attack" && parent === "perform") return attacks[index].get(text.toLowerCase()) ?? text;

        if ((table === "classes" && path.join(".") === "spellList") ||
          (key === "lists" && ((table === "spells" && path.length === 1) || (parent === "spells" && path.includes("choices"))))) return maps.classes.get(text) ?? text;

        // DB spellId/groupId/originFeatId/school are identifiers, never seed names.
        return translatable(key, parent, path, text) ? translateAt(translations, `${kind}/${slug}/${fieldPath}`, text) : text;
      }) as typeof row;

      if (table === "artifacts" && "modifiers" in row) localized.modifiers = Array.isArray(modifiers) ? modifiers.map((record) => localizeModifier(record, translations, maps.artifacts, slug)) : modifiers;

      return localized;
    });
  }

  return { ...out, rules: localizeRules(bundle.rules, translations) };
}
