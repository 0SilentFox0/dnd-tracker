import type { Skill, SkillFormValues } from "@/types/skills";

export function initialSkillFormValues(skill: Skill | undefined): SkillFormValues {
  return {
    name: skill?.name || "",
    description: skill?.description || "",
    icon: skill?.icon || "",
    abilities: skill?.abilities ?? [],
    spellId: skill?.spellId || null,
    spellGroupId: skill?.spellGroupId || null,
    grantedSpellId: skill?.grantedSpellId ?? null,
    mainSkillId: skill?.mainSkillId || null,
  };
}
