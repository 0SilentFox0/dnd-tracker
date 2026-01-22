/**
 * Константи для характеристик D&D 5e
 */

export const ABILITY_SCORES = [
  { key: "strength", label: "Сила", abbreviation: "STR" },
  { key: "dexterity", label: "Спритність", abbreviation: "DEX" },
  { key: "constitution", label: "Статура", abbreviation: "CON" },
  { key: "intelligence", label: "Інтелект", abbreviation: "INT" },
  { key: "wisdom", label: "Мудрість", abbreviation: "WIS" },
  { key: "charisma", label: "Харизма", abbreviation: "CHA" },
  { key: "hitPoints", label: "Хіти", abbreviation: "HP" },
  { key: "speed", label: "Швидкість", abbreviation: "SPD" },
  { key: "armorClass", label: "Захист", abbreviation: "AC" },
  { key: "initiative", label: "Ініціатива", abbreviation: "INIT" },
  { key: "spellSaveDC", label: "Захист від Заклинань", abbreviation: "SPD" },
  { key: "spellAttackBonus", label: "Бонус до заклинань", abbreviation: "SAB" },
  { key: "spellSlots", label: "Заклинання", abbreviation: "SS" },
  { key: "moral", label: "Мораль", abbreviation: "MOR" },
] as const;

export type AbilityScore = (typeof ABILITY_SCORES)[number]["key"];
