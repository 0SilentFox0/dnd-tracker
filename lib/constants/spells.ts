import { SPELL_GROUP_FALLBACK_COLOR } from "@/lib/constants/spell-groups";
import type { SpellSlotProgression } from "@/types/races";

export const DEFAULT_SPELL_SLOT_PROGRESSION: SpellSlotProgression[] = [1, 2, 3, 4, 5].map((level) => ({ level, slots: 0 }));

export const SPELL_IDS_QUERY_MAX = 200;

export const MAX_SPELL_LEVEL = 9;

/* eslint-disable no-restricted-syntax -- matching data: group names saved in either locale are parsed back to a level */
const CIRCLE_ORDINALS = [
  ["", "Перше", "Друге", "Третє", "Четверте", "П'яте", "Шосте", "Сьоме", "Восьме", "Дев'яте"],
  ["", "First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth"],
];

const CANTRIP_NAMES = ["Замовляння", "Cantrip"];

const CIRCLE_SUFFIXES = ["коло", "circle", "level"];

export const ROMAN_NUMERALS = ["0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"] as const;

export function spellLevelName(level: number, t: (key: string) => string): string {
  return level >= 0 && level <= MAX_SPELL_LEVEL ? t(`spellLevels.${level}`) : String(level);
}

export function spellLevelFromName(name: string): number {
  const text = name.trim().toLowerCase();

  if (CANTRIP_NAMES.some((n) => n.toLowerCase() === text)) return 0;

  for (const ordinals of CIRCLE_ORDINALS) {
    const index = ordinals.findIndex((ordinal, i) => i > 0 && CIRCLE_SUFFIXES.some((suffix) => text === `${ordinal.toLowerCase()} ${suffix}`));

    if (index > 0) return index;
  }

  return parseInt(text, 10) || 0;
}
/* eslint-enable no-restricted-syntax */

export function spellLevelRoman(level: number): string {
  return ROMAN_NUMERALS[Math.max(0, level)] ?? String(level);
}

export function spellSchoolColor(group: { color?: string | null } | null | undefined): string {
  return group?.color || SPELL_GROUP_FALLBACK_COLOR;
}

export const SPELL_COST_KEYS = ["action", "bonusAction", "reaction", "long"] as const;

export const SPELL_TARGETING_KINDS = ["enemy", "ally", "self", "allyDead", "allAlliesDead", "area", "template", "allAllies", "allEnemies", "everyone"] as const;

export const TEMPLATE_SHAPE_KEYS = ["circle", "cube", "cone", "line", "cross", "emanation"] as const;

export const SPELL_SAVE_ON_SUCCESS_KEYS = ["half", "none"] as const;

export const SPELL_NAME_MAX = 100;
