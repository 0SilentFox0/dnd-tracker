import type { RaceFormData, StatModifier } from "@/types/races";
import type { SpellSlotProgression } from "@/types/races";

export function parsePassiveAbility(pa: unknown): {
  description: string;
  statImprovements: string;
  statModifiers: Record<string, StatModifier>;
} {
  if (!pa) {
    return { description: "", statImprovements: "", statModifiers: {} };
  }

  if (typeof pa === "string") {
    return { description: pa, statImprovements: "", statModifiers: {} };
  }

  if (typeof pa === "object" && pa !== null) {
    const obj = pa as Record<string, unknown>;

    const statModifiers = obj.statModifiers;

    const parsedModifiers =
      statModifiers &&
      typeof statModifiers === "object" &&
      !Array.isArray(statModifiers)
        ? (statModifiers as Record<string, StatModifier>)
        : {};

    return {
      description: String(obj.description || ""),
      statImprovements: String(obj.statImprovements || ""),
      statModifiers: parsedModifiers,
    };
  }

  return { description: "", statImprovements: "", statModifiers: {} };
}

const DEFAULT_SPELL_SLOT_PROGRESSION: SpellSlotProgression[] = [
  { level: 1, slots: 0 },
  { level: 2, slots: 0 },
  { level: 3, slots: 0 },
  { level: 4, slots: 0 },
  { level: 5, slots: 0 },
];

export function getInitialRaceFormData(race: {
  name: string;
  availableSkills: unknown;
  passiveAbility?: unknown;
  spellSlotProgression?: unknown;
}): RaceFormData {
  const parsedPassiveAbility = parsePassiveAbility(race.passiveAbility);

  const progression = Array.isArray(race.spellSlotProgression)
    ? (race.spellSlotProgression as SpellSlotProgression[])
    : [];

  return {
    name: race.name,
    availableSkills: Array.isArray(race.availableSkills) ? race.availableSkills : [],
    disabledSkills: [],
    passiveAbility: parsedPassiveAbility,
    spellSlotProgression:
      progression.length > 0 ? progression : DEFAULT_SPELL_SLOT_PROGRESSION,
  };
}
