const ABILITIES = ["intelligence", "wisdom", "charisma"] as const;

export type SpellcastingAbility = (typeof ABILITIES)[number];

export const SPELL_ABILITY_OPTIONS = [
  { value: "intelligence", label: "Інтелект" },
  { value: "wisdom", label: "Мудрість" },
  { value: "charisma", label: "Харизма" },
];

export function toSpellcastingAbility(value: string): SpellcastingAbility | undefined {
  return (ABILITIES as readonly string[]).includes(value) ? (value as SpellcastingAbility) : undefined;
}
