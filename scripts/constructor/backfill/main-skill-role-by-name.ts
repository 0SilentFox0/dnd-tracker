import type { MainSkillRole } from "@/lib/constants/main-skills";

const normalize = (name: string) => name.toLowerCase().trim().replace(/\s+/g, " ");

export const MAIN_SKILL_ROLE_BY_NAME: Record<string, MainSkillRole> = {
  напад: "attack",
  стрільба: "ranged",
  захист: "defense",
  "магія світла": "magic",
  "магія темряви": "magic",
  "магія хаосу": "magic",
  "магія призиву": "magic",
  "темна магія": "magic",
  світло: "magic",
  темрява: "magic",
  хаос: "magic",
  природа: "magic",
  призив: "magic",
  сорсерія: "magic",
  лідерство: "leadership",
  раса: "race",
  ультимат: "ultimate",
  персональні: "personal",
};

export function mainSkillRoleByName(name: string): MainSkillRole | null {
  return MAIN_SKILL_ROLE_BY_NAME[normalize(name).replace(/_/g, " ")] ?? null;
}
