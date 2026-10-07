export const skillKeys = {
  list: (campaignId: string) => ["skills", campaignId] as const,
  byMainSkill: (campaignId: string, mainSkillId: string) => ["skills", campaignId, "by-main-skill", mainSkillId] as const,
  detail: (campaignId: string, skillId: string) => ["skill", campaignId, skillId] as const,
  mainSkills: (campaignId: string) => ["main-skills", campaignId] as const,
  trees: (campaignId: string) => ["skill-trees", campaignId] as const,
  progressionOf: (campaignId: string) => ["character-progression", campaignId] as const,
  progression: (campaignId: string, characterId: string) => ["character-progression", campaignId, characterId] as const,
};
