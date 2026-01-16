/**
 * Типи для системи дерев прокачки
 */

export enum SkillLevel {
  BASIC = "basic",
  ADVANCED = "advanced",
  EXPERT = "expert",
}

// Константа з усіма рівнями навиків (типізована)
export const SKILL_LEVELS = [
  SkillLevel.BASIC,
  SkillLevel.ADVANCED,
  SkillLevel.EXPERT,
] as const;

export type SkillLevelType = SkillLevel;

export type SkillCircle = 1 | 2 | 3; // Внутрішнє (1), Середнє (2), Зовнішнє (3) - починається з 3

export interface Skill {
  id: string;
  name: string;
  description: string;
  icon?: string;
  circle: SkillCircle;
  level: SkillLevel;
  prerequisites?: string[]; // IDs навиків, які потрібно вивчити перед цим
}

export interface MainSkill {
  id: string;
  name: string;
  color: string;
  icon?: string;
  levelIcons?: {
    basic?: string;
    advanced?: string;
    expert?: string;
  };
  levelSkillIds?: {
    basic?: string;
    advanced?: string;
    expert?: string;
  };
  levels: {
    basic: {
      circle1: Skill[];
      circle2: Skill[];
      circle3: Skill[];
    };
    advanced: {
      circle1: Skill[];
      circle2: Skill[];
      circle3: Skill[];
    };
    expert: {
      circle1: Skill[];
      circle2: Skill[];
      circle3: Skill[];
    };
  };
}

export interface CentralSkill {
  id: string;
  name: string;
  description: string;
  icon?: string;
  requiredMainSkillId: string; // ID основного навику, який має бути повністю прокачений
}

export interface UltimateSkill {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

export interface SkillTree {
  id: string;
  campaignId: string;
  race: string;
  mainSkills: MainSkill[];
  centralSkills: CentralSkill[]; // 4 навики в центрі
  ultimateSkill: UltimateSkill; // Ультимативний навик
  createdAt: Date;
}

export interface CharacterSkillProgress {
  characterId: string;
  skillTreeId: string;
  unlockedSkills: string[]; // IDs вивчених навиків
  updatedAt: Date;
}

// Доступні раси та їх магія
export const RACE_MAGIC: Record<string, string[]> = {
  human: ["light", "summoning"],
  elf: ["light", "summoning"],
  dark_elf: ["dark", "chaos"],
  necromancer: ["dark", "chaos"],
  demon: ["dark", "chaos"],
  wizard: ["light", "dark", "chaos", "summoning"],
  dwarf: ["runic"], // В майбутньому
  orc: ["battle_cries"], // В майбутньому
};

// Відключені скіли для кожної раси
export const DISABLED_SKILLS_BY_RACE: Record<string, string[]> = {
  wizard: ["attack", "archery"],
};

// Основні навики (однакові для всіх рас)
export const MAIN_SKILLS = [
  { id: "attack", name: "Напад", color: "rgba(217, 78, 74, 1)" },
  { id: "defense", name: "Захист", color: "darkblue" },
  { id: "archery", name: "Стрільба", color: "forestgreen" },
  { id: "leadership", name: "Лідерство", color: "sandybrown" },
  { id: "learning", name: "Навчання", color: "gainsboro" },
  { id: "sorcery", name: "Чародійство", color: "#ae2978" },
  { id: "light_magic", name: "Світла магія", color: "yellow" },
  { id: "dark_magic", name: "Темна магія", color: "darkred" },
  { id: "chaos_magic", name: "Магія Хаосу", color: "dodgerblue" },
  { id: "summoning_magic", name: "Магія Призиву", color: "sandybrown" },
  { id: "racial", name: "Рассовий Навик", color: "gainsboro" },
] as const;
