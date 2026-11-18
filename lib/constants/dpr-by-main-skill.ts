import { SkillLevel } from '@/types/skill-tree';

export const DPR_BY_LEVEL_MAGIC: Record<SkillLevel, number> = {
    [SkillLevel.BASIC]: 25,
    [SkillLevel.ADVANCED]: 50,
    [SkillLevel.EXPERT]: 75,
};

export const DPR_BY_LEVEL_NON_MAGIC: Record<SkillLevel, number> = {
    [SkillLevel.BASIC]: 15,
    [SkillLevel.ADVANCED]: 25,
    [SkillLevel.EXPERT]: 40,
};
