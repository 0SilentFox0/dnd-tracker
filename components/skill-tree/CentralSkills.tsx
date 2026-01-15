import type { CentralSkill } from "@/lib/types/skill-tree";
import { getPositionPercent, SKILL_TREE_CONSTANTS } from "./utils";
import { SKILL_COLORS, SKILL_SIZES, Z_INDEX } from "./constants";

interface CentralSkillsProps {
  centralSkills: CentralSkill[];
  unlockedCentralSkills: string[];
  canLearnCentralSkill: (skill: CentralSkill) => boolean;
  onSkillClick: (skill: CentralSkill) => void;
}

export function CentralSkills({
  centralSkills,
  unlockedCentralSkills,
  canLearnCentralSkill,
  onSkillClick,
}: CentralSkillsProps) {
  const { innerRadiusPercent } = SKILL_TREE_CONSTANTS;

  return (
    <>
      {centralSkills.slice(0, 3).map((centralSkill, index) => {
        const angle = (index * Math.PI * 2) / 3 - Math.PI / 2; // Починаємо зверху
        const triangleRadiusPercent = innerRadiusPercent * 0.6;
        const position = getPositionPercent(angle, triangleRadiusPercent);

        const isUnlocked = unlockedCentralSkills.includes(centralSkill.id);
        const canLearn = canLearnCentralSkill(centralSkill);

        return (
          <div
            key={centralSkill.id}
            className={`absolute rounded-full border-3 border-white cursor-pointer transition-opacity duration-200 ${
              canLearn || isUnlocked
                ? "hover:opacity-80"
                : "cursor-not-allowed opacity-50"
            }`}
            style={{
              ...position,
              ...SKILL_SIZES.centralSkill,
              marginLeft: SKILL_SIZES.centralSkill.margin,
              marginTop: SKILL_SIZES.centralSkill.margin,
              backgroundColor: isUnlocked
                ? SKILL_COLORS.centralUnlocked
                : SKILL_COLORS.centralLocked,
              zIndex: Z_INDEX.centralSkills,
            }}
            onClick={() => {
              if (canLearn || isUnlocked) {
                onSkillClick(centralSkill);
              }
            }}
            title={`${centralSkill.name}${
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
      })}
    </>
  );
}
