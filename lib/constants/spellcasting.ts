/**
 * Константи для заклинань D&D 5e
 */

export const SPELLCASTING_ABILITIES = [
  { value: "intelligence", label: "Інтелект" },
  { value: "wisdom", label: "Мудрість" },
  { value: "charisma", label: "Харизма" },
] as const;

export type SpellcastingAbility = (typeof SPELLCASTING_ABILITIES)[number]["value"];
