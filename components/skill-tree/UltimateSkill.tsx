import type { UltimateSkill } from "@/lib/types/skill-tree";
import { SKILL_COLORS, SKILL_SIZES, Z_INDEX } from "./constants";

interface UltimateSkillProps {
  ultimateSkill: UltimateSkill;
  unlockedUltimateSkill: boolean;
  canLearnUltimateSkill: boolean;
  onSkillClick: (skill: UltimateSkill) => void;
}

export function UltimateSkillComponent({
  ultimateSkill,
  unlockedUltimateSkill,
  canLearnUltimateSkill,
  onSkillClick,
}: UltimateSkillProps) {
  return (
    <div
      className={`absolute rounded-full border-4 border-white cursor-pointer transition-opacity duration-200 ${
        canLearnUltimateSkill || unlockedUltimateSkill
          ? "hover:opacity-80"
          : "cursor-not-allowed opacity-50"
      }`}
      style={{
        left: "50%",
        top: "50%",
        ...SKILL_SIZES.ultimateSkill,
        marginLeft: SKILL_SIZES.ultimateSkill.margin,
        marginTop: SKILL_SIZES.ultimateSkill.margin,
        backgroundColor: unlockedUltimateSkill
          ? SKILL_COLORS.ultimateUnlocked
          : canLearnUltimateSkill
          ? SKILL_COLORS.ultimateAvailable
          : SKILL_COLORS.ultimateLocked,
        zIndex: Z_INDEX.ultimateSkill,
      }}
      onClick={() => {
        if (canLearnUltimateSkill || unlockedUltimateSkill) {
          onSkillClick(ultimateSkill);
        }
      }}
      title={`${ultimateSkill.name}${
        unlockedUltimateSkill
          ? " - Вивчено"
          : canLearnUltimateSkill
          ? " - Доступно"
          : " - Потрібно 3 центральні навики"
      }`}
    >
      {unlockedUltimateSkill && (
        <div className="absolute inset-0 flex items-center justify-center text-white text-lg font-bold">
          ★
        </div>
      )}
    </div>
  );
}
