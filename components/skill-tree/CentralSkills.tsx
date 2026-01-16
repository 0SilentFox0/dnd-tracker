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
  // Відображаємо лише перший центральний навик в самому центрі
  const centralSkill = centralSkills[0];
  if (!centralSkill) return null;

  const isUnlocked = unlockedCentralSkills.includes(centralSkill.id);
  const canLearn = canLearnCentralSkill(centralSkill);

  return (
    <div
      data-skill-id={centralSkill.id}
      data-skill-type="central"
      data-unlocked={canLearn || isUnlocked ? "true" : "false"}
      data-learned={isUnlocked ? "true" : "false"}
      data-can-learn={canLearn ? "true" : "false"}
      className={`absolute rounded-full border-2 sm:border-3 cursor-pointer transition-opacity duration-200 ${
        canLearn || isUnlocked
          ? "hover:opacity-80 active:opacity-70"
          : "cursor-not-allowed"
      }`}
      style={{
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        ...SKILL_SIZES.centralSkill,
        marginLeft: SKILL_SIZES.centralSkill.margin,
        marginTop: SKILL_SIZES.centralSkill.margin,
        backgroundColor: isUnlocked
          ? SKILL_COLORS.centralUnlocked
          : SKILL_COLORS.centralLocked,
        borderColor: canLearn || isUnlocked ? "white" : "#6b7280",
        opacity: isUnlocked ? 1 : 0.5,
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
          ? " - Доступно (потрібно 3 навики з кола 2)"
          : " - Потрібно 3 навики з кола 2"
      }`}
    >
      {isUnlocked && (
        <div className="absolute inset-0 flex items-center justify-center text-white text-[10px] sm:text-xs font-bold">
          ✓
        </div>
      )}
    </div>
  );
}
