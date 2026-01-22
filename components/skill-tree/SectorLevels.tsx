import type { MainSkill } from "@/types/skill-tree";
import { SkillLevel } from "@/types/skill-tree";
import { SectorLevel } from "./SectorLevel";

interface SectorLevelsProps {
  mainSkills: MainSkill[];
  sectorAngle: number;
  outerRadiusPercent: number;
  innerRadiusPercent: number;
}

export function SectorLevels({
  mainSkills,
  sectorAngle,
  outerRadiusPercent,
  innerRadiusPercent,
}: SectorLevelsProps) {
  const levelHeight = (outerRadiusPercent - innerRadiusPercent) / 3;
  const basicRadiusPercent = innerRadiusPercent + levelHeight;
  const advancedRadiusPercent = innerRadiusPercent + levelHeight * 2;
  const expertRadiusPercent = outerRadiusPercent;

  return (
    <>
      {/* Рівень Expert (найтемніший, зовні) */}
      <SectorLevel
        mainSkills={mainSkills}
        sectorAngle={sectorAngle}
        radiusPercent={expertRadiusPercent}
        levelName={SkillLevel.EXPERT}
        darkenPercent={0.4}
      />

      {/* Рівень Advanced (середній) */}
      <SectorLevel
        mainSkills={mainSkills}
        sectorAngle={sectorAngle}
        radiusPercent={advancedRadiusPercent}
        levelName={SkillLevel.ADVANCED}
        darkenPercent={0.2}
      />

      {/* Рівень Basic (найсвітліший, всередині) */}
      <SectorLevel
        mainSkills={mainSkills}
        sectorAngle={sectorAngle}
        radiusPercent={basicRadiusPercent}
        levelName={SkillLevel.BASIC}
        darkenPercent={0}
      />
    </>
  );
}
