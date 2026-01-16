import type { MainSkill } from "@/lib/types/skill-tree";
import { SkillLevel, SKILL_LEVELS } from "@/lib/types/skill-tree";
import { MainSkillLevel } from "./MainSkillLevel";

interface MainSkillLevelsProps {
  mainSkill: MainSkill;
  midAngle: number;
  sectorAngle: number;
  unlockedSkills: string[];
  isDMMode?: boolean;
  onLevelClick?: (mainSkill: MainSkill, level: SkillLevel) => void;
}

export function MainSkillLevels({
  mainSkill,
  midAngle,
  sectorAngle,
  unlockedSkills,
  isDMMode = false,
  onLevelClick,
}: MainSkillLevelsProps) {
  return (
    <>
      {SKILL_LEVELS.map((level, levelIndex) => {
        const levelAngleOffset = (levelIndex / 3) * sectorAngle * 0.8;
        const levelAngle = midAngle + levelAngleOffset;

        return (
          <MainSkillLevel
            key={`main-${level}`}
            mainSkill={mainSkill}
            level={level}
            angle={levelAngle}
            unlockedSkills={unlockedSkills}
            isDMMode={isDMMode}
            onLevelClick={onLevelClick}
          />
        );
      })}
    </>
  );
}
