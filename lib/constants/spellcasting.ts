/**
 * Константи для заклинань D&D 5e
 */
import { ABILITY_SCORES } from "./abilities";

// Витягуємо тільки характеристики для заклинань з ABILITY_SCORES
const SPELLCASTING_ABILITY_KEYS = ["intelligence", "wisdom", "charisma"] as const;

type SpellcastingKey = (typeof SPELLCASTING_ABILITY_KEYS)[number];

export const SPELLCASTING_ABILITIES = ABILITY_SCORES
  .filter(
    (ability): ability is Extract<typeof ABILITY_SCORES[number], { key: SpellcastingKey }> =>
      (SPELLCASTING_ABILITY_KEYS as readonly string[]).includes(ability.key)
  )
  .map((ability) => ({
    value: ability.key,
    label: ability.label,
  })) as unknown as readonly [
  { value: "intelligence"; label: string },
  { value: "wisdom"; label: string },
  { value: "charisma"; label: string }
];

export type SpellcastingAbility = (typeof SPELLCASTING_ABILITIES)[number]["value"];
