import type { SkillAffectingDamage } from "@/lib/utils/characters/damage-calculator";
import type { ProgressionSkillDto } from "@/types/progression";

export function damageSkillsFromProgression(learnedSkillIds: string[], skills: Record<string, ProgressionSkillDto>): SkillAffectingDamage[] {
  return [...new Set(learnedSkillIds)].flatMap((id) => {
    const skill = skills[id];

    return skill?.damageAffinity.affectsDamage ? [{ id, name: skill.name, damageType: skill.damageAffinity.damageType }] : [];
  });
}
