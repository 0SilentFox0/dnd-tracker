import type { PackHooks } from "../types";
import { normalizeCreatureHeader } from "./i18n/creature-header";
import { normalizeSpellHeader } from "./i18n/spell-header";
import { CLEARABLE_SPELL_COLUMNS, resolveSchoolRefs, withClassIcons } from "./prepare";

export const D20_HOOKS: PackHooks = {
  async prepareRows(kind, rows, { pack, icons, idByName }) {
    const classed = kind === "classes" ? withClassIcons(rows, icons) : rows;

    return kind !== "spell-groups" && pack.manifest.kinds.includes("spell-groups") ? resolveSchoolRefs(classed, await idByName("spell-groups")) : classed;
  },
  clearableColumns: { spells: CLEARABLE_SPELL_COLUMNS },
  normalizeTranslation: (entry, text, glossary) => normalizeCreatureHeader(entry.en, normalizeSpellHeader(entry.en, text, glossary), glossary),
};
