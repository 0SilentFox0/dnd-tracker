import type { Skill, MainSkill } from "@/lib/types/skill-tree";
import { SKILL_TREE_CONSTANTS } from "./utils";
import { SkillCircle } from "./SkillCircle";

interface SkillCircleGroupProps {
  skills: Skill[];
  mainSkill: MainSkill;
  circleNumber: 1 | 2 | 3;
  midAngle: number;
  sectorAngle: number;
  unlockedSkills: string[];
  canLearnSkill: (skill: Skill) => boolean;
  onSkillClick: (skill: Skill) => void;
}

const CIRCLE_CONFIG = {
  3: {
    angleSpread: 0.7,
    radiusMultiplier: 0.91,
    sizePercent: 4.5,
    getAngleOffset: (index: number, total: number, angleSpread: number) =>
      ((index - 1.15) / (total - 1 || 1)) * angleSpread,
  },
  2: {
    angleSpread: 1.1,
    radiusMultiplier: 0.5,
    sizePercent: 4.5,
    getAngleOffset: (index: number, _total: number, angleSpread: number) =>
      ((index - 1.05) / 2) * angleSpread,
  },
  1: {
    angleSpread: 0.35,
    radiusMultiplier: 1.19,
    sizePercent: 4.5,
    getAngleOffset: (index: number, _total: number, angleSpread: number) =>
      ((index + 1.5) / 2) * angleSpread,
  },
} as const;

export function SkillCircleGroup({
  skills,
  mainSkill,
  circleNumber,
  midAngle,
  sectorAngle,
  unlockedSkills,
  canLearnSkill,
  onSkillClick,
}: SkillCircleGroupProps) {
  const { outerRadiusPercent, innerRadiusPercent } = SKILL_TREE_CONSTANTS;
  const config = CIRCLE_CONFIG[circleNumber];

  return (
    <>
      {skills.map((skill, skillIndex) => {
        const angleSpread = sectorAngle * config.angleSpread;
        const skillAngleOffset = config.getAngleOffset(
          skillIndex,
          skills.length,
          angleSpread
        );
        const skillAngle = midAngle + skillAngleOffset;

        let radiusPercent: number;
        if (circleNumber === 3) {
          radiusPercent = outerRadiusPercent * config.radiusMultiplier;
        } else if (circleNumber === 2) {
          radiusPercent =
            (innerRadiusPercent + outerRadiusPercent) * config.radiusMultiplier;
        } else {
          radiusPercent = innerRadiusPercent * config.radiusMultiplier;
        }

        const isUnlocked = unlockedSkills.includes(skill.id);
        const canLearn = canLearnSkill(skill);

        return (
          <SkillCircle
            key={`circle${circleNumber}-${skill.id}`}
            skill={skill}
            mainSkillId={mainSkill.id}
            circleNumber={circleNumber}
            angle={skillAngle}
            radiusPercent={radiusPercent}
            sizePercent={config.sizePercent}
            isUnlocked={isUnlocked}
            canLearn={canLearn}
            onSkillClick={onSkillClick}
          />
        );
      })}
    </>
  );
}
