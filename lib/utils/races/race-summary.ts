import { ABILITY_SCORES } from "@/lib/constants/abilities";
import { getSkillMainSkillId, getSkillRaces } from "@/lib/utils/skills/skill-helpers";
import type { MainSkill } from "@/types/main-skills";
import type { Race, StatModifier } from "@/types/races";
import type { Skill } from "@/types/skills";

export interface RacePassiveAbility {
  description: string;
  statImprovements?: string;
  statModifiers?: Record<string, StatModifier>;
}

const isOpenToRace = (skill: Skill, race: Race) => {
  const skillRaces = getSkillRaces(skill);

  return !skillRaces || skillRaces.length === 0 || skillRaces.includes(race.id) || skillRaces.includes(race.name);
};

export function countRaceSkills(race: Race, skills: Skill[]): number {
  const allowedMainSkills = Array.isArray(race.availableSkills) ? race.availableSkills : [];

  if (allowedMainSkills.length === 0) return skills.filter((skill) => isOpenToRace(skill, race)).length;

  return skills.filter((skill) => {
    const mainSkillId = getSkillMainSkillId(skill);

    return (!mainSkillId || allowedMainSkills.includes(mainSkillId)) && isOpenToRace(skill, race);
  }).length;
}

export function raceMainSkillsForDisplay(race: Race, mainSkills: MainSkill[]): MainSkill[] {
  const ids = Array.isArray(race.availableSkills) ? race.availableSkills : [];

  if (ids.length === 0) return mainSkills.filter((ms) => ms.id !== "racial" && ms.id !== "ultimate");

  return ids.map((id) => mainSkills.find((ms) => ms.id === id)).filter((ms): ms is MainSkill => ms != null);
}

export function normalizePassiveAbility(race: Race): RacePassiveAbility | null {
  const passive = race.passiveAbility;

  if (!passive) return null;

  if (typeof passive === "string") return { description: passive, statImprovements: undefined, statModifiers: undefined };

  if (typeof passive !== "object") return null;

  return {
    description: "description" in passive ? String(passive.description) : "",
    statImprovements: "statImprovements" in passive ? String(passive.statImprovements || "") : undefined,
    statModifiers: "statModifiers" in passive ? (passive.statModifiers as Record<string, StatModifier>) : undefined,
  };
}

export function modifiedAbilityScores(passive: RacePassiveAbility | null) {
  return ABILITY_SCORES.filter((ability) => {
    const modifiers = passive?.statModifiers?.[ability.key];

    return modifiers && (modifiers.bonus || modifiers.nonNegative || modifiers.alwaysZero);
  });
}
