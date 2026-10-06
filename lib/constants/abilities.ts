/**
 * Константи для характеристик D&D 5e
 */

export const ABILITY_KEYS = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] as const;

export type AbilityKey = (typeof ABILITY_KEYS)[number];

export const CORE_ABILITY_SCORES = [
  { key: "strength", label: "Сила", abbreviation: "STR" },
  { key: "dexterity", label: "Спритність", abbreviation: "DEX" },
  { key: "constitution", label: "Статура", abbreviation: "CON" },
  { key: "intelligence", label: "Інтелект", abbreviation: "INT" },
  { key: "wisdom", label: "Мудрість", abbreviation: "WIS" },
  { key: "charisma", label: "Харизма", abbreviation: "CHA" },
] as const;

export const ABILITY_LABELS = Object.fromEntries(CORE_ABILITY_SCORES.map((a) => [a.key, a.label])) as Record<AbilityKey, string>;

export const ABILITY_SHORT_LABELS: Record<AbilityKey, string> = {
  strength: "СИЛ",
  dexterity: "СПР",
  constitution: "ТІЛ",
  intelligence: "ІНТ",
  wisdom: "МУД",
  charisma: "ХАР",
};

export const ABILITY_SCORES = [
  ...CORE_ABILITY_SCORES,
  { key: "hitPoints", label: "Хіти", abbreviation: "HP" },
  { key: "speed", label: "Швидкість", abbreviation: "SPD" },
  { key: "armorClass", label: "Захист", abbreviation: "AC" },
  { key: "initiative", label: "Ініціатива", abbreviation: "INIT" },
  { key: "spellSaveDC", label: "Захист від Заклинань", abbreviation: "DC" },
  { key: "spellAttackBonus", label: "Бонус до заклинань", abbreviation: "SAB" },
  { key: "spellSlots", label: "Заклинання", abbreviation: "SS" },
  { key: "moral", label: "Мораль", abbreviation: "MOR" },
] as const;

export type AbilityScore = (typeof ABILITY_SCORES)[number]["key"];
