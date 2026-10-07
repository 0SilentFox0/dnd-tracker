import { extractRaceImmunities } from "@/lib/utils/races/race-effects";
import type { Character } from "@/types/characters";
import type { Race } from "@/types/races";

type RaceFromPrisma = Omit<Race, "availableSkills" | "disabledSkills" | "spellSlotProgression" | "passiveAbility"> & {
  availableSkills?: unknown;
  disabledSkills?: unknown;
  spellSlotProgression?: unknown;
  passiveAbility?: unknown;
};

/**
 * Отримує всі імунітети персонажа, включаючи імунітети з раси
 */
export function getCharacterImmunities(
  character: Character | { immunities?: string[] | null } | { immunities?: unknown } | Record<string, unknown>,
  race: Race | RaceFromPrisma | null | undefined
): string[] {
  const characterImmunities = Array.isArray(character.immunities)
    ? character.immunities
    : [];

  const raceImmunities = extractRaceImmunities(race);

  const allImmunities = [...characterImmunities, ...raceImmunities];

  return Array.from(new Set(allImmunities.map((i) => i.toLowerCase().trim())))
    .map((i) => {
      return (
        characterImmunities.find(
          (ci) => ci.toLowerCase().trim() === i
        ) ||
        raceImmunities.find(
          (ri: string) => ri.toLowerCase().trim() === i
        ) ||
        i
      );
    });
}
