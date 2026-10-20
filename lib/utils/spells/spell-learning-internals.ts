import { SkillLevel, type SkillLevelType } from "@/types/skill-tree";

type SkillLike = { spellGroupId?: string | null; grantedSpellId?: string | null };

export const SKILL_LEVEL_ORDER: Record<SkillLevelType, number> = {
  [SkillLevel.BASIC]: 1,
  [SkillLevel.ADVANCED]: 2,
  [SkillLevel.EXPERT]: 3,
};

/**
 * Рівні магії (кумулятивно) за рівнем школи.
 * Базовий → [1,2], Просунутий → [1,2,3,4], Експертний → [1,2,3,4,5].
 */
export function getSpellLevelsForSkillLevel(skillLevel: SkillLevelType): number[] {
  switch (skillLevel) {
    case SkillLevel.BASIC:
      return [1, 2];
    case SkillLevel.ADVANCED:
      return [1, 2, 3, 4];
    case SkillLevel.EXPERT:
      return [1, 2, 3, 4, 5];
    default:
      return [];
  }
}

export interface SpellSkillInfo { spellGroupId: string | null; grantedSpellId: string | null }

export function toSpellSkillInfo(skill: SkillLike): SpellSkillInfo {
  return { spellGroupId: skill.spellGroupId ?? null, grantedSpellId: skill.grantedSpellId ?? null };
}
