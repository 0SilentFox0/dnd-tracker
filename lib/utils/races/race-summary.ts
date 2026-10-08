import { ABILITY_SCORES } from "@/lib/constants/abilities";
import { getSkillMainSkillId } from "@/lib/utils/skills/skill-helpers";
import type { MainSkill } from "@/types/main-skills";
import type { Race, StatModifier } from "@/types/races";
import type { Skill } from "@/types/skills";

export interface RacePassiveAbility {
  name?: string;
  icon?: string;
  description: string;
  appearanceDescription?: string;
  statImprovements?: string;
  statModifiers?: Record<string, StatModifier>;
}

export function countRaceSkills(race: Race, skills: Skill[]): number {
  const allowedMainSkills = Array.isArray(race.availableSkills) ? race.availableSkills : [];

  if (allowedMainSkills.length === 0) return skills.length;

  return skills.filter((skill) => {
    const mainSkillId = getSkillMainSkillId(skill);

    return !mainSkillId || allowedMainSkills.includes(mainSkillId);
  }).length;
}

export function raceMainSkillsForDisplay(race: Race, mainSkills: MainSkill[]): MainSkill[] {
  const ids = Array.isArray(race.availableSkills) ? race.availableSkills : [];

  if (ids.length === 0) return mainSkills.filter((ms) => ms.id !== "racial" && ms.id !== "ultimate");

  return ids.map((id) => mainSkills.find((ms) => ms.id === id)).filter((ms): ms is MainSkill => ms != null);
}

export function normalizePassiveAbility(race: { passiveAbility?: unknown }): RacePassiveAbility | null {
  const passive = race.passiveAbility;

  if (!passive) return null;

  if (typeof passive === "string") return { description: passive, statImprovements: undefined, statModifiers: undefined };

  if (typeof passive !== "object") return null;

  const obj = passive as Record<string, unknown>;

  const mods = obj.statModifiers;

  const text = (v: unknown) => (typeof v === "string" && v !== "" ? v : undefined);

  return {
    ...(text(obj.name) && { name: text(obj.name) }),
    ...(text(obj.icon) && { icon: text(obj.icon) }),
    ...(text(obj.appearanceDescription) && { appearanceDescription: text(obj.appearanceDescription) }),
    description: String(obj.description || ""),
    statImprovements: "statImprovements" in obj ? String(obj.statImprovements || "") : undefined,
    statModifiers: mods && typeof mods === "object" && !Array.isArray(mods) ? (mods as Record<string, StatModifier>) : undefined,
  };
}

export function modifiedAbilityScores(passive: RacePassiveAbility | null) {
  return ABILITY_SCORES.filter((ability) => {
    const modifiers = passive?.statModifiers?.[ability.key];

    return modifiers && (modifiers.bonus || modifiers.nonNegative || modifiers.alwaysZero);
  });
}
