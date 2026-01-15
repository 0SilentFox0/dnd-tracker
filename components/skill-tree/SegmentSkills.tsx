import type { Skill, MainSkill } from "@/lib/types/skill-tree";
import { SkillCircleGroup } from "./SkillCircleGroup";

interface SegmentSkillsProps {
  mainSkill: MainSkill;
  midAngle: number;
  sectorAngle: number;
  unlockedSkills: string[];
  canLearnSkill: (skill: Skill) => boolean;
  onSkillClick: (skill: Skill) => void;
}

export function SegmentSkills({
  mainSkill,
  midAngle,
  sectorAngle,
  unlockedSkills,
  canLearnSkill,
  onSkillClick,
}: SegmentSkillsProps) {
  return (
    <>
      {/* Коло 3 - 3 навики (найбільша частина сегменту, зовні) */}
      <SkillCircleGroup
        skills={mainSkill.levels.basic.circle3}
        mainSkill={mainSkill}
        circleNumber={3}
        midAngle={midAngle}
        sectorAngle={sectorAngle}
        unlockedSkills={unlockedSkills}
        canLearnSkill={canLearnSkill}
        onSkillClick={onSkillClick}
      />

      {/* Коло 2 - 2 навики (середня частина сегменту) */}
      <SkillCircleGroup
        skills={mainSkill.levels.basic.circle2}
        mainSkill={mainSkill}
        circleNumber={2}
        midAngle={midAngle}
        sectorAngle={sectorAngle}
        unlockedSkills={unlockedSkills}
        canLearnSkill={canLearnSkill}
        onSkillClick={onSkillClick}
      />

      {/* Коло 1 - 1 навик (найменша частина сегменту, всередині) */}
      <SkillCircleGroup
        skills={mainSkill.levels.basic.circle1}
        mainSkill={mainSkill}
        circleNumber={1}
        midAngle={midAngle}
        sectorAngle={sectorAngle}
        unlockedSkills={unlockedSkills}
        canLearnSkill={canLearnSkill}
        onSkillClick={onSkillClick}
      />
    </>
  );
}
