import { OptimizedImage } from "@/components/common/OptimizedImage";
import { SKILL_COLORS, SKILL_SIZES, Z_INDEX } from "@/components/skill-tree/utils/constants";
import type { UltimateSkill } from "@/types/skill-tree";

interface UltimateSkillProps {
  ultimateSkill: UltimateSkill;
  unlockedUltimateSkill: boolean;
  canLearnUltimateSkill: boolean;
  isDMMode?: boolean;
  onSkillClick?: (skill: UltimateSkill) => void;
}

export function UltimateSkillComponent({
  ultimateSkill,
  unlockedUltimateSkill,
  canLearnUltimateSkill,
  isDMMode = false,
  onSkillClick,
}: UltimateSkillProps) {
  return (
    <div
      data-skill-id={ultimateSkill.id}
      data-skill-type="ultimate"
      data-unlocked={isDMMode || canLearnUltimateSkill || unlockedUltimateSkill ? "true" : "false"}
      data-learned={unlockedUltimateSkill ? "true" : "false"}
      data-can-learn={isDMMode || canLearnUltimateSkill ? "true" : "false"}
      className={`absolute rounded-full border-2 sm:border-4 cursor-pointer transition-opacity duration-200 ${
        isDMMode || canLearnUltimateSkill || unlockedUltimateSkill
          ? "hover:opacity-80 active:opacity-70"
          : "cursor-not-allowed"
      }`}
      style={{
        left: "50%",
        top: "50%",
        ...SKILL_SIZES.ultimateSkill,
        marginLeft: SKILL_SIZES.ultimateSkill.margin,
        marginTop: SKILL_SIZES.ultimateSkill.margin,
        backgroundColor: unlockedUltimateSkill
          ? SKILL_COLORS.unlocked // Зелений фон для прокачаних
          : canLearnUltimateSkill
          ? SKILL_COLORS.ultimateAvailable
          : SKILL_COLORS.ultimateLocked,
        borderColor: isDMMode || canLearnUltimateSkill || unlockedUltimateSkill ? "white" : "#6b7280",
        opacity: unlockedUltimateSkill ? 1 : 0.5,
        zIndex: Z_INDEX.ultimateSkill,
      }}
      onClick={() => {
        if (isDMMode || canLearnUltimateSkill || unlockedUltimateSkill) {
          if (onSkillClick) {
            onSkillClick(ultimateSkill);
          }
        }
      }}
      title={`${ultimateSkill.name}${
        unlockedUltimateSkill
          ? " - Вивчено"
          : canLearnUltimateSkill
          ? " - Доступно"
          : " - Потрібно 3 навики з кола 2"
      }`}
    >
      {ultimateSkill.icon ? (
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-full">
          <OptimizedImage
            src={ultimateSkill.icon}
            alt={ultimateSkill.name}
            width={64}
            height={64}
            className="w-full h-full object-cover"
            fallback={
              <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground text-[8px] sm:text-xs font-bold">
                {ultimateSkill.name.charAt(0).toUpperCase()}
              </div>
            }
          />
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground text-[8px] sm:text-xs font-bold rounded-full">
          {ultimateSkill.name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}
