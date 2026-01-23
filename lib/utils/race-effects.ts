/**
 * Утиліти для роботи з ефектами рас
 */

import { COMMON_IMMUNITIES, IMMUNITY_PATTERNS } from "@/lib/constants/immunities";
import type { Race } from "@/types/races";
import type { Unit } from "@/types/units";

// Тип для Race з Prisma (JSON поля)
type RaceFromPrisma = Omit<Race, "availableSkills" | "disabledSkills" | "spellSlotProgression" | "passiveAbility"> & {
  availableSkills?: unknown;
  disabledSkills?: unknown;
  spellSlotProgression?: unknown;
  passiveAbility?: unknown;
};

/**
 * Парсить пасивну здібність раси та витягує імунітети
 */
export function extractRaceImmunities(race: Race | RaceFromPrisma | null | undefined): string[] {
  if (!race?.passiveAbility) return [];

  const passiveAbility = race.passiveAbility;

  const description =
    typeof passiveAbility === "string"
      ? passiveAbility
      : (typeof passiveAbility === "object" && passiveAbility !== null && "description" in passiveAbility
        ? String((passiveAbility as { description?: unknown }).description || "")
        : "");

  if (!description) return [];

  const immunities: string[] = [];

  const descriptionLower = description.toLowerCase();

  // Перевіряємо загальні імунітети з констант
  for (const common of COMMON_IMMUNITIES) {
    if (descriptionLower.includes(`імунітет до ${common}`) ||
        descriptionLower.includes(`імунітет на ${common}`) ||
        descriptionLower.includes(`імунітет проти ${common}`) ||
        descriptionLower.includes(`імунітет ${common}`)) {
      if (!immunities.some(i => i.toLowerCase().includes(common))) {
        immunities.push(common);
      }
    }
  }

  // Шукаємо фрази типу "імунітет до X" за допомогою патернів
  for (const pattern of IMMUNITY_PATTERNS) {
    const matches = description.matchAll(pattern);

    for (const match of matches) {
      if (match[1]) {
        const immunity = match[1].trim();

        if (immunity && !immunities.includes(immunity)) {
          immunities.push(immunity);
        }
      }
    }
  }

  return immunities;
}

/**
 * Отримує всі імунітети юніта, включаючи імунітети з раси
 */
export function getUnitImmunities(
  unit: Unit,
  race: Race | null | undefined
): string[] {
  const unitImmunities = Array.isArray(unit.immunities)
    ? unit.immunities
    : [];

  const raceImmunities = extractRaceImmunities(race);

  // Об'єднуємо та видаляємо дублікати
  const allImmunities = [...unitImmunities, ...raceImmunities];

  return Array.from(new Set(allImmunities.map((i) => i.toLowerCase().trim())))
    .map((i) => {
      // Знаходимо оригінальну назву (з правильним регістром)
      return (
        unitImmunities.find(
          (ui) => ui.toLowerCase().trim() === i
        ) ||
        raceImmunities.find(
          (ri) => ri.toLowerCase().trim() === i
        ) ||
        i
      );
    });
}

/**
 * Парсить пасивну здібність раси та витягує модифікатори урону
 */
export function extractRaceDamageModifiers(
  race: Race | RaceFromPrisma | null | undefined
): string[] {
  if (!race?.passiveAbility) return [];

  const passiveAbility = race.passiveAbility;

  const description =
    typeof passiveAbility === "string"
      ? passiveAbility
      : (typeof passiveAbility === "object" && passiveAbility !== null && "description" in passiveAbility
        ? String((passiveAbility as { description?: unknown }).description || "")
        : "");

  if (!description) return [];

  const modifiers: string[] = [];

  const descriptionLower = description.toLowerCase();

  // Шукаємо фрази типу "модифікатор атаки - X"
  const modifierPatterns = [
    /модифікатор атаки[:\s-]+([^,\.;]+)/gi,
    /модифікатор урону[:\s-]+([^,\.;]+)/gi,
    /урон[:\s-]+([^,\.;]+)/gi,
  ];

  for (const pattern of modifierPatterns) {
    const matches = description.matchAll(pattern);

    for (const match of matches) {
      if (match[1]) {
        const modifier = match[1].trim();

        if (modifier && !modifiers.includes(modifier)) {
          modifiers.push(modifier);
        }
      }
    }
  }

  return modifiers;
}

/**
 * Отримує всі модифікатори урону юніта, включаючи модифікатори з раси
 */
export function getUnitDamageModifiers(
  unit: Unit,
  race: Race | null | undefined
): string[] {
  const unitModifiers: string[] = [];

  if (unit.damageModifier) {
    unitModifiers.push(unit.damageModifier);
  }

  const raceModifiers = extractRaceDamageModifiers(race);

  // Об'єднуємо та видаляємо дублікати
  const allModifiers = [...unitModifiers, ...raceModifiers];

  return Array.from(
    new Set(allModifiers.map((m) => m.toLowerCase().trim()))
  ).map((m) => {
    // Знаходимо оригінальну назву (з правильним регістром)
    return (
      unitModifiers.find((um) => um.toLowerCase().trim() === m) ||
      raceModifiers.find((rm) => rm.toLowerCase().trim() === m) ||
      m
    );
  });
}
