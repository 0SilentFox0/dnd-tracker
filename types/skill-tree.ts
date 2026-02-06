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

export enum SkillCircle {
  INNER = 1, // Внутрішнє коло
  MIDDLE = 2, // Середнє коло
  OUTER = 3, // Зовнішнє коло
}

// Константа з усіма колами (типізована)
export const SKILL_CIRCLES = [
  SkillCircle.INNER,
  SkillCircle.MIDDLE,
  SkillCircle.OUTER,
] as const;

export type SkillCircleType = SkillCircle;

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
  /** Якщо true — не виводити у колі дерева прокачки */
  isEnableInSkillTree?: boolean;
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
