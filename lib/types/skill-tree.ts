/**
 * Типи для системи дерев прокачки
 */

export type SkillLevel = "basic" | "advanced" | "expert";

export type SkillCircle = 1 | 2 | 3; // Внутрішнє (1), Середнє (2), Зовнішнє (3)

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
  requiredCentralSkillIds: string[]; // IDs 3 центральних навиків, які потрібно вивчити
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

// Основні навики (однакові для всіх рас)
export const MAIN_SKILLS = [
  { id: "attack", name: "Напад", color: "#ef4444" },
  { id: "defense", name: "Захист", color: "#3b82f6" },
  { id: "archery", name: "Стрільба", color: "#10b981" },
  { id: "leadership", name: "Лідерство", color: "#f59e0b" },
  { id: "learning", name: "Навчання", color: "#06b6d4" },
  { id: "sorcery", name: "Чародійство", color: "#6366f1" },
  { id: "light_magic", name: "Світла магія", color: "#fbbf24" },
  { id: "dark_magic", name: "Темна магія", color: "#1f2937" },
  { id: "chaos_magic", name: "Магія Хаосу", color: "#dc2626" },
  { id: "summoning_magic", name: "Магія Призиву", color: "#7c3aed" },
  { id: "racial", name: "Рассовий Навик", color: "#14b8a6" },
] as const;
