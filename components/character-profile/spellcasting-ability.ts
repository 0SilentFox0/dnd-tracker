import { SPELLCASTING_ABILITIES, type SpellcastingAbility } from "@/lib/constants/abilities";

export type { SpellcastingAbility };

export const SPELL_ABILITY_OPTIONS = [
  { value: "intelligence", label: "Інтелект" },
  { value: "wisdom", label: "Мудрість" },
  { value: "charisma", label: "Харизма" },
];

export function toSpellcastingAbility(value: string): SpellcastingAbility | undefined {
  return (SPELLCASTING_ABILITIES as readonly string[]).includes(value) ? (value as SpellcastingAbility) : undefined;
}
