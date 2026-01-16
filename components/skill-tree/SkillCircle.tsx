import type { Skill } from "@/lib/types/skill-tree";
import { SkillLevel } from "@/lib/types/skill-tree";
import { getPositionPercent } from "./utils";
import { SKILL_COLORS, Z_INDEX } from "./constants";
import { OptimizedImage } from "@/components/common/OptimizedImage";

interface SkillCircleProps {
  skill: Skill;
  mainSkillId: string;
  circleNumber: 1 | 2 | 3;
  angle: number;
  radiusPercent: number;
  sizePercent: number;
  isUnlocked: boolean;
  canLearn: boolean;
  onSkillClick?: (skill: Skill) => void;
  onSkillSlotClick?: (slot: {
    mainSkillId: string;
    circle: 1 | 2 | 3;
    level: SkillLevel;
    index: number;
  }) => void;
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
  skillIndex = 0,
  isDMMode = false,
  selectedSkillFromLibrary,
}: SkillCircleProps) {
  const position = getPositionPercent(angle, radiusPercent);
  // Округлюємо marginOffset для уникнення помилок гідрації
  const marginOffsetValue = sizePercent / 2;
  const marginOffset = `-${Math.round(marginOffsetValue * 100) / 100}%`;

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
        ...position,
        width: `${Math.round(sizePercent * 100) / 100}%`,
        height: `${Math.round(sizePercent * 100) / 100}%`,
        marginLeft: marginOffset,
        marginTop: marginOffset,
        backgroundColor: isUnlocked
          ? SKILL_COLORS.unlocked
          : SKILL_COLORS.locked,
        borderColor: canLearn || isUnlocked ? "white" : "#6b7280",
        opacity: isUnlocked ? 1 : 0.5,
        zIndex: Z_INDEX.skills,
      }}
      onClick={() => {
        console.log("=== SkillCircle onClick ===");
        console.log("isDMMode:", isDMMode);
        console.log("onSkillSlotClick:", !!onSkillSlotClick);
        console.log("selectedSkillFromLibrary:", selectedSkillFromLibrary);
        console.log("skill:", skill);
        console.log("mainSkillId:", mainSkillId);
        console.log("circleNumber:", circleNumber);
        console.log("skillIndex:", skillIndex);
        console.log("isUnlocked:", isUnlocked);
        console.log("canLearn:", canLearn);
        console.log("onSkillClick:", !!onSkillClick);

        if (isDMMode && onSkillSlotClick) {
          // У режимі DM клік на слот призначає вибраний скіл цьому слоту
          // Викликаємо onSkillSlotClick завжди, навіть якщо скіл не вибрано
          // (обробка відбувається в батьківському компоненті)
          const slotData = {
            mainSkillId,
            circle: circleNumber,
            level: skill.level,
            index: skillIndex,
          };
          console.log("DM Mode - Calling onSkillSlotClick with:", slotData);
          console.log("Slot data details:", {
            mainSkillId: slotData.mainSkillId,
            circle: slotData.circle,
            level: slotData.level,
            index: slotData.index,
            selectedSkillId: selectedSkillFromLibrary,
          });
          onSkillSlotClick(slotData);
        } else if ((canLearn || isUnlocked) && onSkillClick) {
          // У режимі Player клік на скіл прокачує його
          console.log("Player mode - calling onSkillClick");
          console.log("Skill to learn:", {
            id: skill.id,
            name: skill.name,
            level: skill.level,
            circle: circleNumber,
          });
          onSkillClick(skill);
        } else {
          console.log("Click ignored - conditions not met");
          console.log("Conditions check:", {
            isDMMode,
            hasOnSkillSlotClick: !!onSkillSlotClick,
            canLearn,
            isUnlocked,
            hasOnSkillClick: !!onSkillClick,
          });
        }
      }}
      title={`${skill.name} (Коло ${circleNumber})${
        isUnlocked ? " - Вивчено" : canLearn ? " - Доступно" : " - Недоступно"
      }`}
    >
      {(() => {
        const skillIcon = (skill as Skill & { icon?: string }).icon;

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
