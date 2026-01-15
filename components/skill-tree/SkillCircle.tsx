import type { Skill } from "@/lib/types/skill-tree";
import { getPositionPercent } from "./utils";
import { SKILL_COLORS, Z_INDEX } from "./constants";

interface SkillCircleProps {
  skill: Skill;
  mainSkillId: string;
  circleNumber: 1 | 2 | 3;
  angle: number;
  radiusPercent: number;
  sizePercent: number;
  isUnlocked: boolean;
  canLearn: boolean;
  onSkillClick: (skill: Skill) => void;
}

export function SkillCircle({
  skill,
  mainSkillId,
  circleNumber,
  angle,
  radiusPercent,
  sizePercent,
  isUnlocked,
  canLearn,
  onSkillClick,
}: SkillCircleProps) {
  const position = getPositionPercent(angle, radiusPercent);
  const marginOffset = `-${sizePercent / 2}%`;

  return (
    <div
      data-circle={circleNumber}
      data-skill-id={skill.id}
      data-main-skill-id={mainSkillId}
      data-level="basic"
      data-unlocked={isUnlocked}
      className={`absolute rounded-full border-3 border-white cursor-pointer transition-opacity duration-200 ${
        canLearn || isUnlocked
          ? "hover:opacity-80"
          : "cursor-not-allowed opacity-50"
      }`}
      style={{
        ...position,
        width: `${sizePercent}%`,
        height: `${sizePercent}%`,
        marginLeft: marginOffset,
        marginTop: marginOffset,
        backgroundColor: isUnlocked
          ? SKILL_COLORS.unlocked
          : SKILL_COLORS.locked,
        zIndex: Z_INDEX.skills,
      }}
      onClick={() => {
        if (canLearn || isUnlocked) {
          onSkillClick(skill);
        }
      }}
      title={`${skill.name} (Коло ${circleNumber})${
        isUnlocked
          ? " - Вивчено"
          : canLearn
          ? " - Доступно"
          : " - Недоступно"
      }`}
    >
      {isUnlocked && (
        <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
          ✓
        </div>
      )}
    </div>
  );
}
