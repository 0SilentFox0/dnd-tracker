import type { SpellSlotProgression } from "@/types/races";

export const DEFAULT_SPELL_SLOT_PROGRESSION: SpellSlotProgression[] = [1, 2, 3, 4, 5].map((level) => ({ level, slots: 0 }));

export const SPELL_IDS_QUERY_MAX = 200;

const SPELL_CIRCLE_ORDINALS = ["", "Перше", "Друге", "Третє", "Четверте", "П'яте", "Шосте", "Сьоме", "Восьме", "Дев'яте"];

const CANTRIP_NAME = "Замовляння";

export const ROMAN_NUMERALS = ["0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"] as const;

export function spellLevelName(level: number): string {
  if (level <= 0) return CANTRIP_NAME;

  const ordinal = SPELL_CIRCLE_ORDINALS[level];

  return ordinal ? `${ordinal} коло` : `${level}-те коло`;
}

export function spellLevelFromName(name: string): number {
  if (name === CANTRIP_NAME) return 0;

  const index = SPELL_CIRCLE_ORDINALS.findIndex((ordinal, i) => i > 0 && name === `${ordinal} коло`);

  return index > 0 ? index : parseInt(name, 10) || 0;
}

export function spellLevelRoman(level: number): string {
  return ROMAN_NUMERALS[Math.max(0, level)] ?? String(level);
}
