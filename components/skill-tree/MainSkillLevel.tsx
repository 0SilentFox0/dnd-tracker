import type { MainSkill } from "@/lib/types/skill-tree";
import { SkillLevel } from "@/lib/types/skill-tree";
import { getPositionPercent, SKILL_TREE_CONSTANTS } from "./utils";
import {
  getLevelStatus,
  canLearnMainSkillLevel,
  getMainSkillLevelId,
} from "./hooks";
import { SKILL_COLORS, SKILL_SIZES, LEVEL_NAMES, Z_INDEX } from "./constants";
import { OptimizedImage } from "@/components/common/OptimizedImage";

interface MainSkillLevelProps {
  mainSkill: MainSkill;
  level: SkillLevel;
  angle: number;
  unlockedSkills: string[];
  isDMMode?: boolean;
  onLevelClick?: (mainSkill: MainSkill, level: SkillLevel) => void;
}

export function MainSkillLevel({
  mainSkill,
  level,
  angle,
  unlockedSkills,
  isDMMode = false,
  onLevelClick,
}: MainSkillLevelProps) {
  const { mainSkillRadiusPercent } = SKILL_TREE_CONSTANTS;
  // Округлюємо кут для уникнення помилок гідрації
  const adjustedAngle = Math.round((angle - 0.2) * 1000) / 1000;
  const position = getPositionPercent(adjustedAngle, mainSkillRadiusPercent);

  const { hasUnlocked } = getLevelStatus(mainSkill, level, unlockedSkills);

  // Перевіряємо чи прокачаний main-skill-level (окремий навик)
  const mainSkillLevelId = getMainSkillLevelId(mainSkill.id, level);
  const isMainSkillLevelLearned = unlockedSkills.includes(mainSkillLevelId);

  // Перевіряємо послідовність прокачки: basic -> advanced -> expert
  // В DM mode всі скіли доступні для редагування
  const canLearnThisLevel =
    isDMMode || canLearnMainSkillLevel(level, mainSkill.id, unlockedSkills);

  return (
    <div
      data-skill-type="main-skill-level"
      data-skill-level={level}
      data-main-skill-id={mainSkill.id}
      data-unlocked={canLearnThisLevel ? "true" : "false"}
      data-learned={isMainSkillLevelLearned ? "true" : "false"}
      data-partially-unlocked={hasUnlocked ? "true" : "false"}
      data-can-learn={canLearnThisLevel ? "true" : "false"}
      className={`absolute rounded-full border-2 sm:border-3 transition-all ${
        canLearnThisLevel
          ? "hover:opacity-80 active:opacity-70 cursor-pointer"
          : "cursor-not-allowed"
      }`}
      onClick={() => {
        if (canLearnThisLevel && onLevelClick) {
          onLevelClick(mainSkill, level);
        }
      }}
      style={{
        ...position,
        ...SKILL_SIZES.mainSkillLevel,
        marginLeft: SKILL_SIZES.mainSkillLevel.margin,
        marginTop: SKILL_SIZES.mainSkillLevel.margin,
        backgroundColor: isMainSkillLevelLearned
          ? SKILL_COLORS.unlocked
          : SKILL_COLORS.centralLocked,
        borderColor: canLearnThisLevel ? "white" : "#6b7280",
        opacity: isMainSkillLevelLearned ? 1 : 0.5,
        zIndex: Z_INDEX.skills,
      }}
      title={`${mainSkill.name} - ${LEVEL_NAMES[level]}${
        isMainSkillLevelLearned
          ? " (Прокачано - дає доступ до кола 3)"
          : canLearnThisLevel
          ? " (Не прокачано - клікніть щоб прокачати)"
          : level === SkillLevel.ADVANCED
          ? " (Спочатку прокачайте Основи)"
          : " (Спочатку прокачайте Просунутий)"
      }`}
    >
      {mainSkill.levelIcons?.[level] || mainSkill.icon ? (
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-full">
          <OptimizedImage
            src={mainSkill.levelIcons?.[level] || mainSkill.icon || ""}
            alt={mainSkill.name}
            width={64}
            height={64}
            className="w-full h-full object-cover"
            fallback={
              <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground text-[8px] sm:text-xs font-bold">
                {mainSkill.name.charAt(0).toUpperCase()}
              </div>
            }
          />
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground text-[8px] sm:text-xs font-bold rounded-full">
          {mainSkill.name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}
