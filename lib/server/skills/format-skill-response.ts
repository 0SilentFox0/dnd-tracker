import { skillRowFields, type SkillRowForResponse } from "@/lib/server/skills/format-skills-response";
import { withAbilityIssues } from "@/lib/utils/abilities/read";

export function formatSkillResponse(skill: SkillRowForResponse) {
  return withAbilityIssues("skill", skill, skillRowFields(skill));
}
