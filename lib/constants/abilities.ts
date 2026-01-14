/**
 * Константи для характеристик D&D 5e
 */

export const ABILITY_SCORES = [
  { key: "strength", label: "Сила (STR)" },
  { key: "dexterity", label: "Спритність (DEX)" },
  { key: "constitution", label: "Статура (CON)" },
  { key: "intelligence", label: "Інтелект (INT)" },
  { key: "wisdom", label: "Мудрість (WIS)" },
  { key: "charisma", label: "Харизма (CHA)" },
] as const;

export type AbilityScore = (typeof ABILITY_SCORES)[number]["key"];
