import { OptimizedImage } from "@/components/common/OptimizedImage";
import { SKILL_COLORS, Z_INDEX } from "@/components/skill-tree/utils/constants";
import { getPositionPercent } from "@/components/skill-tree/utils/utils";
import type { Skill } from "@/types/skill-tree";
import { SkillCircle as SkillCircleEnum, SkillLevel } from "@/types/skill-tree";

interface SkillCircleProps {
  skill: Skill;
  mainSkillId: string;
  circleNumber: SkillCircleEnum;
  angle: number;
  radiusPercent: number;
  sizePercent: number;
  isUnlocked: boolean;
  canLearn: boolean;
  onSkillClick?: (skill: Skill) => void;
  onSkillSlotClick?: (slot: {
    mainSkillId: string;
    circle: SkillCircleEnum;
    level: SkillLevel;
    index: number;
    isMainSkillLevel?: boolean;
    isRacial?: boolean;
  }) => void;
  onRemoveSkill?: (slot: {
    mainSkillId: string;
    circle: SkillCircleEnum;
    level: SkillLevel;
    index: number;
  }) => void;
  onSelectSkillForRemoval?: (slot: {
    mainSkillId: string;
    circle: SkillCircleEnum;
    level: SkillLevel;
    index: number;
    skillName: string;
  }) => void;
  isSelectedForRemoval?: boolean;
  skillIndex?: number;
  isDMMode?: boolean;
  selectedSkillFromLibrary?: string | null;
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
  onSkillSlotClick,
  onSelectSkillForRemoval,
  isSelectedForRemoval = false,
  skillIndex = 0,
  isDMMode = false,
  selectedSkillFromLibrary,
}: SkillCircleProps) {
  const position = getPositionPercent(angle - 1.83, radiusPercent);

  return (
    <div
      data-circle={circleNumber}
      data-skill-id={skill.id}
      data-main-skill-id={mainSkillId}
      data-level={skill.level}
      data-unlocked={canLearn || isUnlocked ? "true" : "false"}
      data-learned={isUnlocked ? "true" : "false"}
      data-can-learn={canLearn ? "true" : "false"}
      className={`absolute rounded-full border-2 sm:border-3 transition-opacity duration-200 ${
        isDMMode
          ? selectedSkillFromLibrary
            ? "cursor-pointer hover:opacity-80 active:opacity-70 border-yellow-400 border-4"
            : "cursor-pointer hover:opacity-80 active:opacity-70 opacity-50"
          : canLearn || isUnlocked
            ? "cursor-pointer hover:opacity-80 active:opacity-70"
            : "cursor-not-allowed"
      }`}
      style={{
        position: "absolute",
        ...position,
        width: `${Math.round(sizePercent * 100) / 100}%`,
        height: `${Math.round(sizePercent * 100) / 100}%`,
        transform: "translate(-50%, -50%)",
        backgroundColor: isSelectedForRemoval
          ? "#ef4444" // Червоний колір для вибраного для видалення
          : isUnlocked
            ? SKILL_COLORS.unlocked
            : SKILL_COLORS.locked,
        borderColor: isSelectedForRemoval
          ? "#dc2626" // Темно-червоний border
          : canLearn || isUnlocked
            ? "white"
            : "#6b7280",
        borderWidth: isSelectedForRemoval ? "3px" : undefined,
        opacity: isUnlocked ? 1 : 0.5,
        zIndex: isDMMode ? 10 : Z_INDEX.skills,
        pointerEvents: "auto",
        minWidth: 24,
        minHeight: 24,
      }}
      onClick={() => {
        if (isDMMode) {
          const slotData = {
            mainSkillId,
            circle: circleNumber,
            level: skill.level,
            index: skillIndex,
          };

          // Якщо вибрано скіл з бібліотеки — завжди призначаємо/перезаписуємо слот (навіть якщо там уже мок)
          if (selectedSkillFromLibrary && onSkillSlotClick) {
            onSkillSlotClick(slotData);

            return;
          }

          // Інакше: якщо скіл уже присвоєний — режим видалення
          const skillIcon = (skill as Skill & { icon?: string }).icon;

          const isPlaceholder =
            !skill.id || skill.id.startsWith("placeholder_");

          const isAssigned = !isPlaceholder && (skillIcon || skill.name);

          if (isAssigned && onSelectSkillForRemoval) {
            onSelectSkillForRemoval({
              ...slotData,
              skillName: skill.name,
            });
          } else if (onSkillSlotClick) {
            onSkillSlotClick(slotData);
          }
        } else if ((canLearn || isUnlocked) && onSkillClick) {
          // У режимі Player клік на скіл прокачує його
          onSkillClick(skill);
        }
      }}
      title={
        skill.id && skill.id.startsWith("placeholder_")
          ? `Порожній слот (Коло ${circleNumber}) - Натисніть для призначення скіла`
          : `${skill.name} (Коло ${circleNumber})${
              isUnlocked
                ? " - Вивчено"
                : canLearn
                  ? " - Доступно"
                  : " - Недоступно"
            }`
      }
    >
      {(() => {
        const skillIcon = (skill as Skill & { icon?: string }).icon;

        const isPlaceholder = !skill.id || skill.id.startsWith("placeholder_");

        // Якщо це placeholder - відображаємо порожнє коло
        if (isPlaceholder) {
          return null; // Порожнє коло без контенту
        }

        return skillIcon ? (
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-full">
            <OptimizedImage
              src={skillIcon}
              alt={skill.name}
              width={64}
              height={64}
              className="w-full h-full object-cover"
              fallback={
                <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground text-[8px] sm:text-xs font-bold">
                  {skill.name.charAt(0).toUpperCase()}
                </div>
              }
            />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground text-[8px] sm:text-xs font-bold rounded-full">
            {skill.name.charAt(0).toUpperCase()}
          </div>
        );
      })()}
    </div>
  );
}
