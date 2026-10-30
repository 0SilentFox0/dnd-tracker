export const MAIN_SKILL_ROLES = ["attack", "ranged", "defense", "magic", "leadership", "race", "ultimate", "personal"] as const;

export type MainSkillRole = (typeof MAIN_SKILL_ROLES)[number];

export const MAIN_SKILL_NAME_MAX = 100;
