/* eslint-disable no-restricted-syntax -- data: uk labels matched when importing content */
export const MAIN_SKILL_ROLES = ["attack", "ranged", "defense", "magic", "leadership", "race", "ultimate", "personal"] as const;

export type MainSkillRole = (typeof MAIN_SKILL_ROLES)[number];

export const MAIN_SKILL_ROLE_LABELS: Record<MainSkillRole, string> = {
  attack: "Напад",
  ranged: "Стрільба",
  defense: "Захист",
  magic: "Магія",
  leadership: "Лідерство",
  race: "Раса",
  ultimate: "Ультимат",
  personal: "Персональні",
};

export const MAIN_SKILL_NAME_MAX = 100;
