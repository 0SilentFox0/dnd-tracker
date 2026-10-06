import { DEFAULT_SPELL_SLOT_PROGRESSION } from "@/lib/constants/spells";
import type { Ability } from "@/lib/utils/abilities/schema";
import { normalizePassiveAbility } from "@/lib/utils/races/race-summary";
import type { RaceFormData, SpellSlotProgression } from "@/types/races";

export function getInitialRaceFormData(race: {
  name: string;
  icon?: string | null;
  color?: string | null;
  availableSkills: unknown;
  passiveAbility?: unknown;
  spellSlotProgression?: unknown;
  abilities?: Ability[];
}): RaceFormData {
  const passive = normalizePassiveAbility(race);

  const progression = Array.isArray(race.spellSlotProgression)
    ? (race.spellSlotProgression as SpellSlotProgression[])
    : [];

  return {
    name: race.name,
    icon: race.icon ?? "",
    color: race.color ?? "",
    availableSkills: Array.isArray(race.availableSkills) ? race.availableSkills : [],
    disabledSkills: [],
    passiveAbility: { description: passive?.description ?? "", statImprovements: passive?.statImprovements ?? "", statModifiers: passive?.statModifiers ?? {} },
    spellSlotProgression:
      progression.length > 0 ? progression : DEFAULT_SPELL_SLOT_PROGRESSION,
    abilities: race.abilities ?? [],
  };
}
