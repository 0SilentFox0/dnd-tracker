/**
 * Типи для UI компонентів skill tree
 */

import type { SkillSlot } from "./battle-ui";
import type { MainSkill, Skill } from "./skill-tree";
import type { SkillCircle as SkillCircleEnum } from "./skill-tree";

/**
 * Геометрія для відображення скілів
 */
export interface SkillGeometry {
  midAngle: number;
  sectorAngle: number;
}

/**
 * Стан для skill tree компонентів
 */
export interface SkillTreeState {
  unlockedSkills: string[];
  selectedSkillForRemoval?: SkillSlot | null;
  selectedSkillFromLibrary?: string | null;
}

/**
 * Колбеки для skill tree компонентів
 */
export interface SkillTreeCallbacks {
  onSkillClick?: (skill: Skill) => void;
  onSkillSlotClick?: (slot: SkillSlot) => void;
  onRemoveSkill?: (slot: SkillSlot) => void;
  onSelectSkillForRemoval?: (slot: SkillSlot & { skillName: string }) => void;
}

/**
 * Підрахунки для skill tree
 */
export interface SkillTreeCounts {
  circle4UnlockedCount: number;
  mainSkillLevelsUnlocked: number;
  circle3UnlockedInSector: number;
  circle2UnlockedInSector: number;
}

/**
 * Конфігурація для skill tree
 */
export interface SkillTreeConfig {
  canLearnSkill: (skill: Skill) => boolean;
  isDMMode?: boolean;
}

/**
 * Пропси для SkillCircleGroup
 */
export interface SkillCircleGroupProps {
  skills: Skill[];
  mainSkill: MainSkill;
  circleNumber: SkillCircleEnum;
  geometry: SkillGeometry;
  state: SkillTreeState;
  callbacks: SkillTreeCallbacks;
  counts: SkillTreeCounts;
  config: SkillTreeConfig;
}
