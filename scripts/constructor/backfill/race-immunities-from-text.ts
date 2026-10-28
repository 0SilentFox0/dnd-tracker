import { immunityAbilities } from "@/lib/utils/abilities/build/immunities";
import type { Ability } from "@/lib/utils/abilities/schema";

export const RACE_IMMUNITIES_ABILITY_ID = "constructor-race-immunities";

const COMMON_IMMUNITIES = [
  "вогню",
  "вогня",
  "контролю",
  "отруєння",
  "сповільнення",
  "страху",
  "чарівництва",
  "магії",
] as const;

const IMMUNITY_PATTERNS = [
  /імунітет до ([^,\.;]+)/gi,
  /імунітет на ([^,\.;]+)/gi,
  /імунітет проти ([^,\.;]+)/gi,
  /імунітет\s+([^,\.;]+)/gi,
] as const;

export function parseRaceImmunityText(race: { passiveAbility?: unknown } | null | undefined): string[] {
  const passiveAbility = race?.passiveAbility;

  if (!passiveAbility) return [];

  const description =
    typeof passiveAbility === "string"
      ? passiveAbility
      : (typeof passiveAbility === "object" && "description" in passiveAbility
        ? String((passiveAbility as { description?: unknown }).description || "")
        : "");

  if (!description) return [];

  const immunities: string[] = [];

  const descriptionLower = description.toLowerCase();

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

  for (const pattern of IMMUNITY_PATTERNS) {
    for (const match of description.matchAll(pattern)) {
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

export function raceImmunityAbility(race: { passiveAbility?: unknown; abilities?: unknown }): Ability | null {
  if (Array.isArray(race.abilities) && race.abilities.length > 0) return null;

  const resolved = immunityAbilities(parseRaceImmunityText(race), { type: "unit", id: "race" })[0];

  if (!resolved) return null;

  const { source: _source, key: _key, ...ability } = resolved;

  return { ...ability, id: RACE_IMMUNITIES_ABILITY_ID };
}
