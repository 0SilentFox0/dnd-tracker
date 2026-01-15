import type { MainSkill } from "@/lib/types/skill-tree";
import { MainSkillLevel } from "./MainSkillLevel";

interface MainSkillLevelsProps {
  mainSkill: MainSkill;
  midAngle: number;
  sectorAngle: number;
  unlockedSkills: string[];
}

export function MainSkillLevels({
  mainSkill,
  midAngle,
  sectorAngle,
  unlockedSkills,
}: MainSkillLevelsProps) {
  return (
    <>
      {(["basic", "advanced", "expert"] as const).map((level, levelIndex) => {
        const levelAngleOffset = (levelIndex / 2) * sectorAngle * 0.6;
        const levelAngle = midAngle + levelAngleOffset;

        return (
          <MainSkillLevel
            key={`main-${level}`}
            mainSkill={mainSkill}
            level={level}
            angle={levelAngle}
            unlockedSkills={unlockedSkills}
          />
        );
      })}
    </>
  );
}
