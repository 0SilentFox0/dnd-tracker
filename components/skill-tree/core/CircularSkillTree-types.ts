import type { Race } from "@/types/races";
import type {
  MainSkill,
  Skill,
  SkillTree,
  UltimateSkill,
} from "@/types/skill-tree";
import { SkillCircle as SkillCircleEnum, SkillLevel } from "@/types/skill-tree";

export interface CircularSkillTreeProps {
  skillTree: SkillTree;
  race?: Race | null;
  unlockedSkills?: string[];
  playerLevel?: number;
  isDMMode?: boolean;
  isTrainingCompleted?: boolean;
  onSkillClick?: (skill: Skill) => void;
  onUltimateSkillClick?: (skill: UltimateSkill) => void;
  onRacialSkillClick?: (mainSkill: MainSkill, level: SkillLevel) => void;
  onSkillSlotClick?: (slot: {
    mainSkillId: string;
    circle: SkillCircleEnum;
    level: SkillLevel;
    index: number;
    isMainSkillLevel?: boolean;
    isRacial?: boolean;
  }) => void;
  onRemoveSkill?: (slot: {
    mainSkillId: string;
    circle: SkillCircleEnum;
    level: SkillLevel;
    index: number;
  }) => void;
  onSelectSkillForRemoval?: (slot: {
    mainSkillId: string;
    circle: SkillCircleEnum;
    level: SkillLevel;
    index: number;
    skillName: string;
  }) => void;
  selectedSkillForRemoval?: {
    mainSkillId: string;
    circle: SkillCircleEnum;
    level: SkillLevel;
    index: number;
    isMainSkillLevel?: boolean;
    isRacial?: boolean;
  } | null;
  selectedSkillFromLibrary?: string | null;
}
