/**
 * Внутрішні типи та константи для spell-learning
 */

import { SkillLevel, type SkillLevelType } from "@/types/skill-tree";
import type { Skill } from "@/types/skills";

export type SkillLike = Skill & {
  spellData?: { spellGroupId?: string };
  basicInfo?: { name?: string };
  spellEnhancementData?: { spellNewSpellId?: string };
  spellGroup?: { id: string; name?: string } | null;
};

export function getSkillSpellGroupId(skill: SkillLike): string | null | undefined {
  return (
    skill.spellGroupId ??
    skill.spellData?.spellGroupId ??
    skill.spellGroup?.id
  );
}

export function getSkillName(skill: SkillLike): string {
  return skill.name ?? skill.basicInfo?.name ?? "";
}

export function getSkillSpellNewSpellId(skill: SkillLike): string | null | undefined {
  return skill.spellNewSpellId ?? skill.spellEnhancementData?.spellNewSpellId;
}

export const SKILL_LEVEL_ORDER: Record<SkillLevelType, number> = {
  [SkillLevel.BASIC]: 1,
  [SkillLevel.ADVANCED]: 2,
  [SkillLevel.EXPERT]: 3,
};

/** Формат ID рівня основної навички: ${mainSkillId}_${level}_level */
export const MAIN_SKILL_LEVEL_RE = /_(basic|advanced|expert)_level$/;

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
