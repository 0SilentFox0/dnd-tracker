/**
 * Утиліти для роботи з ефектами рас для персонажів
 */

import type { Race } from "@/types/races";
import type { Character } from "@/types/characters";
import {
  extractRaceImmunities,
  extractRaceDamageModifiers,
} from "./race-effects";

// Тип для Race з Prisma (JSON поля)
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

  // Об'єднуємо та видаляємо дублікати
  const allImmunities = [...characterImmunities, ...raceImmunities];
  return Array.from(new Set(allImmunities.map((i) => i.toLowerCase().trim())))
    .map((i) => {
      // Знаходимо оригінальну назву (з правильним регістром)
      return (
        characterImmunities.find(
          (ci) => ci.toLowerCase().trim() === i
        ) ||
        raceImmunities.find(
          (ri) => ri.toLowerCase().trim() === i
        ) ||
        i
      );
    });
}

/**
 * Отримує всі модифікатори урону персонажа, включаючи модифікатори з раси
 */
export function getCharacterDamageModifiers(
  character: Character | { damageModifier?: string } | { damageModifier?: unknown } | Record<string, unknown>,
  race: Race | RaceFromPrisma | null | undefined
): string[] {
  const characterModifiers: string[] = [];
  // Якщо в Character є поле damageModifier, додаємо його
  const characterWithModifier = character as Character & { damageModifier?: string };
  if (characterWithModifier.damageModifier) {
    characterModifiers.push(characterWithModifier.damageModifier);
  }

  const raceModifiers = extractRaceDamageModifiers(race);

  // Об'єднуємо та видаляємо дублікати
  const allModifiers = [...characterModifiers, ...raceModifiers];
  return Array.from(
    new Set(allModifiers.map((m) => m.toLowerCase().trim()))
  ).map((m) => {
    // Знаходимо оригінальну назву (з правильним регістром)
    return (
      characterModifiers.find((cm) => cm.toLowerCase().trim() === m) ||
      raceModifiers.find((rm) => rm.toLowerCase().trim() === m) ||
      m
    );
  });
}
