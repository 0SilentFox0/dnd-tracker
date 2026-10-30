export const ABILITY_KEYS = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] as const;

export const ABILITY_SCORE_CAP = 20;

export type AbilityKey = (typeof ABILITY_KEYS)[number];

export const isAbilityKey = (v: unknown): v is AbilityKey => (ABILITY_KEYS as readonly unknown[]).includes(v);

export const SPELLCASTING_ABILITIES = ["intelligence", "wisdom", "charisma"] as const;

export type SpellcastingAbility = (typeof SPELLCASTING_ABILITIES)[number];

export const CORE_ABILITY_SCORES = [
  { key: "strength", abbreviation: "STR" },
  { key: "dexterity", abbreviation: "DEX" },
  { key: "constitution", abbreviation: "CON" },
  { key: "intelligence", abbreviation: "INT" },
  { key: "wisdom", abbreviation: "WIS" },
  { key: "charisma", abbreviation: "CHA" },
] as const;

export function toSpellcastingAbility(value: string): SpellcastingAbility | undefined {
  return (SPELLCASTING_ABILITIES as readonly string[]).includes(value) ? (value as SpellcastingAbility) : undefined;
}

export const STAT_SCORES = [
  { key: "hitPoints", abbreviation: "HP" },
  { key: "speed", abbreviation: "SPD" },
  { key: "armorClass", abbreviation: "AC" },
  { key: "initiative", abbreviation: "INIT" },
  { key: "spellSaveDC", abbreviation: "DC" },
  { key: "spellAttackBonus", abbreviation: "SAB" },
  { key: "spellSlots", abbreviation: "SS" },
  { key: "moral", abbreviation: "MOR" },
] as const;

export const ABILITY_SCORES = [...CORE_ABILITY_SCORES, ...STAT_SCORES] as const;

/** Key under `gameTerms` of an ability or combat-stat name. */
type ScoreKey = (typeof ABILITY_SCORES)[number]["key"];

export const abilityScoreTermKey = (key: ScoreKey) => (isAbilityKey(key) ? (`abilities.${key}.label` as const) : (`stats.${key as Exclude<ScoreKey, AbilityKey>}` as const));


export const DEFAULT_AREA_TARGETS = 3;
