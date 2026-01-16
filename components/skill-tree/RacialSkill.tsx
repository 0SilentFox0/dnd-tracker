import type { MainSkill } from "@/lib/types/skill-tree";
import { SkillLevel, SKILL_LEVELS } from "@/lib/types/skill-tree";
import {
  getLevelStatus,
  canLearnRacialSkillLevel,
  getRacialSkillLevelId,
} from "./hooks";
import { SKILL_COLORS, Z_INDEX, LEVEL_NAMES } from "./constants";
import { OptimizedImage } from "@/components/common/OptimizedImage";

interface RacialSkillProps {
  racialSkill: MainSkill | null;
  unlockedSkills: string[];
  playerLevel?: number;
  isDMMode?: boolean;
  onRacialSkillClick?: (mainSkill: MainSkill, level: SkillLevel) => void;
}

// Вимоги до рівня гравця для кожного рівня расового навику
const RACIAL_SKILL_LEVEL_REQUIREMENTS: Record<SkillLevel, number> = {
  [SkillLevel.BASIC]: 1,
  [SkillLevel.ADVANCED]: 7,
  [SkillLevel.EXPERT]: 13,
};

export function RacialSkill({
  racialSkill,
  unlockedSkills,
  playerLevel = 1,
  isDMMode = false,
  onRacialSkillClick,
}: RacialSkillProps) {
  if (!racialSkill) return null;

  return (
    <div
      className="absolute flex flex-col gap-2 items-center -top-[20%] md:-top-[15%]"
      style={{
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: Z_INDEX.racialSkill,
      }}
    >
      <div
        className="text-[10px] sm:text-xs font-bold text-white mb-1"
        style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.7)" }}
      >
        {racialSkill.name}
      </div>
      <div className="flex gap-1 sm:gap-2">
        {SKILL_LEVELS.map((level) => {
          const { hasUnlocked } = getLevelStatus(
            racialSkill,
            level,
            unlockedSkills
          );

          // Перевіряємо чи рівень гравця достатній для прокачки цього рівня
          const requiredLevel = RACIAL_SKILL_LEVEL_REQUIREMENTS[level];

          // Створюємо унікальний ID для расового навику рівня
          const racialSkillLevelId = getRacialSkillLevelId(
            racialSkill.id,
            level
          );
          const isLearned = unlockedSkills.includes(racialSkillLevelId);

          // Перевіряємо послідовність прокачки: basic -> advanced -> expert
          const canLearnBySequence = canLearnRacialSkillLevel(
            level,
            racialSkill.id,
            unlockedSkills
          );

          // Можна прокачати якщо рівень гравця достатній І послідовність дотримана
          // В DM mode всі скіли доступні
          const canLearn = isDMMode || (playerLevel >= requiredLevel && canLearnBySequence);

          return (
            <div
              key={level}
              data-skill-type="racial"
              data-skill-level={level}
              data-main-skill-id={racialSkill.id}
              data-unlocked={canLearn ? "true" : "false"}
              data-learned={isLearned ? "true" : "false"}
              data-partially-unlocked={hasUnlocked ? "true" : "false"}
              className={`rounded-full border-2 transition-all w-[28px] h-[28px] sm:w-[72px] sm:h-[72px] flex items-center justify-center relative ${
                canLearn
                  ? "cursor-pointer hover:opacity-80 active:opacity-70"
                  : "cursor-not-allowed"
              }`}
              style={{
                backgroundColor: isLearned
                  ? SKILL_COLORS.unlocked
                  : SKILL_COLORS.centralLocked,
                borderColor: canLearn ? "white" : "#6b7280",
                opacity: isLearned ? 1 : 0.5,
              }}
              onClick={() => {
                if (canLearn && onRacialSkillClick) {
                  onRacialSkillClick(racialSkill, level);
                }
              }}
              title={`${racialSkill.name} - ${LEVEL_NAMES[level]}${
                isLearned
                  ? " (Прокачано)"
                  : canLearn
                  ? ` (Доступно з ${requiredLevel} рівня)`
                  : !canLearnBySequence
                  ? level === SkillLevel.ADVANCED
                    ? " (Спочатку прокачайте Основи)"
                    : " (Спочатку прокачайте Просунутий)"
                  : ` (Потрібен ${requiredLevel} рівень, зараз ${playerLevel})`
              }`}
            >
              {racialSkill.icon ? (
                <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-full">
                  <OptimizedImage
                    src={racialSkill.icon}
                    alt={`${racialSkill.name} - ${LEVEL_NAMES[level]}`}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                    fallback={
                      <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground text-[8px] sm:text-xs font-bold">
                        {LEVEL_NAMES[level].charAt(0).toUpperCase()}
                      </div>
                    }
                  />
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground text-[8px] sm:text-xs font-bold rounded-full">
                  {LEVEL_NAMES[level].charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
