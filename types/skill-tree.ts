/**
 * Рівні гілки прокачки (legacy enum; нові модулі — `BranchLevel` з lib/utils/skills/progression)
 */

export enum SkillLevel {
  BASIC = "basic",
  ADVANCED = "advanced",
  EXPERT = "expert",
}

export type SkillLevelType = SkillLevel;
