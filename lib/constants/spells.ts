import { SPELL_GROUP_FALLBACK_COLOR } from "@/lib/constants/spell-groups";
import type { SpellSlotProgression } from "@/types/races";

export const DEFAULT_SPELL_SLOT_PROGRESSION: SpellSlotProgression[] = [1, 2, 3, 4, 5].map((level) => ({ level, slots: 0 }));

export const SPELL_IDS_QUERY_MAX = 200;

export const MAX_SPELL_LEVEL = 9;

export const ROMAN_NUMERALS = ["0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"] as const;

export function spellLevelName(level: number, t: (key: string) => string): string {
  return level >= 0 && level <= MAX_SPELL_LEVEL ? t(`spellLevels.${level}`) : String(level);
}

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
