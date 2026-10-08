import { SkillLevel, type SkillLevelType } from "@/types/skill-tree";
import type { Skill } from "@/types/skills";

type SkillLike = Skill & {
  spellData?: { spellGroupId?: string };
  basicInfo?: { name?: string };
  spellGroup?: { id: string; name?: string } | null;
};

function getSkillSpellGroupId(skill: SkillLike): string | null | undefined {
  return (
    skill.spellGroupId ??
    skill.spellData?.spellGroupId ??
    skill.spellGroup?.id
  );
}

function getSkillSpellNewSpellId(skill: SkillLike): string | null | undefined {
  return skill.spellNewSpellId;
}

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

export interface SpellSkillInfo { spellGroupId: string | null; newSpellId: string | null }

export function toSpellSkillInfo(skill: SkillLike): SpellSkillInfo {
  return { spellGroupId: getSkillSpellGroupId(skill) ?? null, newSpellId: getSkillSpellNewSpellId(skill) ?? null };
}
