import type { MainSkill } from "@/lib/types/skill-tree";
import { getPositionPercent, SKILL_TREE_CONSTANTS } from "./utils";
import { getLevelStatus } from "./hooks";
import { SKILL_COLORS, SKILL_SIZES, LEVEL_NAMES, Z_INDEX } from "./constants";

interface MainSkillLevelProps {
  mainSkill: MainSkill;
  level: "basic" | "advanced" | "expert";
  angle: number;
  unlockedSkills: string[];
}

export function MainSkillLevel({
  mainSkill,
  level,
  angle,
  unlockedSkills,
}: MainSkillLevelProps) {
  const { mainSkillRadiusPercent } = SKILL_TREE_CONSTANTS;
  const position = getPositionPercent(angle, mainSkillRadiusPercent);

  const { hasUnlocked, isFullyUnlocked } = getLevelStatus(
    mainSkill,
    level,
    unlockedSkills
  );

  return (
    <div
      className="absolute rounded-full border-3 border-white transition-colors hover:opacity-80"
      style={{
        ...position,
        ...SKILL_SIZES.mainSkillLevel,
        marginLeft: SKILL_SIZES.mainSkillLevel.margin,
        marginTop: SKILL_SIZES.mainSkillLevel.margin,
        backgroundColor: isFullyUnlocked
          ? SKILL_COLORS.unlocked
          : SKILL_COLORS.centralLocked,
        zIndex: Z_INDEX.skills,
      }}
      title={`${mainSkill.name} - ${LEVEL_NAMES[level]}${
        isFullyUnlocked
          ? " (Повністю прокачано)"
          : hasUnlocked
          ? " (Частково прокачано)"
          : " (Не прокачано)"
      }`}
    >
      {isFullyUnlocked && (
        <div className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold">
          ✓
        </div>
      )}
    </div>
  );
}
