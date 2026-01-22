import type { MainSkill } from "@/types/skill-tree";
import { SkillLevel, SKILL_LEVELS } from "@/types/skill-tree";
import { MainSkillLevel } from "./MainSkillLevel";

interface MainSkillLevelsProps {
  mainSkill: MainSkill;
  midAngle: number;
  sectorAngle: number;
  unlockedSkills: string[];
  isDMMode?: boolean;
  onLevelClick?: (mainSkill: MainSkill, level: SkillLevel) => void;
  onSelectSkillForRemoval?: (slot: {
    mainSkillId: string;
    circle: number;
    level: SkillLevel;
    index: number;
    skillName: string;
    isMainSkillLevel?: boolean;
    isRacial?: boolean;
  }) => void;
  selectedSkillForRemoval?: {
    mainSkillId: string;
    circle: number;
    level: SkillLevel;
    index: number;
    isMainSkillLevel?: boolean;
    isRacial?: boolean;
  } | null;
}

export function MainSkillLevels({
  mainSkill,
  midAngle,
  sectorAngle,
  unlockedSkills,
  isDMMode = false,
  onLevelClick,
  onSelectSkillForRemoval,
  selectedSkillForRemoval,
}: MainSkillLevelsProps) {
  return (
    <>
      {SKILL_LEVELS.map((level, levelIndex) => {
        const levelAngleOffset = (levelIndex / 3) * sectorAngle * 0.9;
        const levelAngle = midAngle + levelAngleOffset;

        const isSelectedForRemoval = selectedSkillForRemoval
          ? selectedSkillForRemoval.mainSkillId === mainSkill.id &&
            selectedSkillForRemoval.level === level &&
            selectedSkillForRemoval.index === 0 &&
            selectedSkillForRemoval.isMainSkillLevel === true // Тільки для main-skill-level
          : false;

        return (
          <MainSkillLevel
            key={`main-${level}`}
            mainSkill={mainSkill}
            level={level}
            angle={levelAngle}
            unlockedSkills={unlockedSkills}
            isDMMode={isDMMode}
            onLevelClick={onLevelClick}
            onSelectSkillForRemoval={onSelectSkillForRemoval}
            isSelectedForRemoval={isSelectedForRemoval}
          />
        );
      })}
    </>
  );
}
