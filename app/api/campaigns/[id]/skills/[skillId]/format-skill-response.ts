import { skillRowFields, type SkillRowForResponse } from "../format-skills-response";

import { readAbilities } from "@/lib/utils/abilities/read";

export function formatSkillResponse(skill: SkillRowForResponse) {
  const { abilities, issues: abilityIssues } = readAbilities("skill", skill);

  return { ...skillRowFields(skill), abilities, abilityIssues };
}
