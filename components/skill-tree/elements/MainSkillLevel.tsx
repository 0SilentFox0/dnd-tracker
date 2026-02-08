import { OptimizedImage } from "@/components/common/OptimizedImage";
import {
  LEVEL_NAMES,
  SKILL_COLORS,
  SKILL_SIZES,
  Z_INDEX,
} from "@/components/skill-tree/utils/constants";
import {
  canLearnMainSkillLevel,
  getLevelStatus,
  getMainSkillLevelId,
} from "@/components/skill-tree/utils/hooks";
import {
  getPositionPercent,
  SKILL_TREE_CONSTANTS,
} from "@/components/skill-tree/utils/utils";
import type { MainSkill } from "@/types/skill-tree";
import { SkillLevel } from "@/types/skill-tree";

interface MainSkillLevelProps {
  mainSkill: MainSkill;
  level: SkillLevel;
  angle: number;
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
  isSelectedForRemoval?: boolean;
}

export function MainSkillLevel({
  mainSkill,
  level,
  angle,
  unlockedSkills,
  isDMMode = false,
  onLevelClick,
  onSelectSkillForRemoval,
  isSelectedForRemoval = false,
}: MainSkillLevelProps) {
  const { mainSkillRadiusPercent } = SKILL_TREE_CONSTANTS;

  // Округлюємо кут для уникнення помилок гідрації
  const adjustedAngle = Math.round((angle - 1.87) * 1000) / 1000;

  const position = getPositionPercent(
    adjustedAngle,
    mainSkillRadiusPercent + 1,
  );

  const { hasUnlocked } = getLevelStatus(mainSkill, level, unlockedSkills);

  // Перевіряємо чи прокачаний main-skill-level (окремий навик)
  const mainSkillLevelId = getMainSkillLevelId(mainSkill.id, level);

  const isMainSkillLevelLearned = unlockedSkills.includes(mainSkillLevelId);

  // Перевіряємо послідовність прокачки: basic -> advanced -> expert
  // В DM mode всі скіли доступні для редагування
  const canLearnThisLevel =
    isDMMode || canLearnMainSkillLevel(level, mainSkill.id, unlockedSkills);

  // Перевіряємо чи скіл присвоєний (має icon для цього рівня)
  const hasAssignedSkill = !!(mainSkill.levelIcons?.[level] || mainSkill.icon);

  return (
    <div
      data-circle="1"
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
        if (isDMMode) {
          if (hasAssignedSkill && onSelectSkillForRemoval) {
            // Якщо скіл присвоєний - активуємо видалення
            onSelectSkillForRemoval({
              mainSkillId: mainSkill.id,
              circle: 1, // Placeholder для main-skill-level
              level,
              index: 0,
              skillName: mainSkill.name,
              isMainSkillLevel: true,
              isRacial: false,
            });
          } else if (onLevelClick) {
            // Якщо скіл не присвоєний - призначаємо вибраний скіл
            onLevelClick(mainSkill, level);
          }
        } else if (canLearnThisLevel && onLevelClick) {
          onLevelClick(mainSkill, level);
        }
      }}
      style={{
        ...position,
        ...SKILL_SIZES.mainSkillLevel,
        marginLeft: SKILL_SIZES.mainSkillLevel.margin,
        marginTop: SKILL_SIZES.mainSkillLevel.margin,
        backgroundColor: isSelectedForRemoval
          ? "#ef4444" // Червоний колір для вибраного для видалення
          : isMainSkillLevelLearned
            ? SKILL_COLORS.unlocked
            : SKILL_COLORS.centralLocked,
        borderColor: isSelectedForRemoval
          ? "#dc2626" // Темно-червоний border
          : canLearnThisLevel
            ? "white"
            : "#6b7280",
        borderWidth: isSelectedForRemoval ? "3px" : undefined,
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
