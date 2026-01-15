import type { MainSkill } from "@/lib/types/skill-tree";
import { getLevelStatus } from "./hooks";
import { SKILL_COLORS, SKILL_SIZES, Z_INDEX, LEVEL_NAMES } from "./constants";

interface RacialSkillProps {
  racialSkill: MainSkill | null;
  unlockedSkills: string[];
}

export function RacialSkill({
  racialSkill,
  unlockedSkills,
}: RacialSkillProps) {
  if (!racialSkill) return null;


  return (
    <div
      className="absolute flex flex-col gap-2 items-center"
      style={{
        top: "1%",
        right: "1%",
        zIndex: Z_INDEX.racialSkill,
      }}
    >
      <div className="text-xs font-bold text-white mb-1" style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.7)" }}>
        {racialSkill.name}
      </div>
      <div className="flex gap-2">
        {(["basic", "advanced", "expert"] as const).map((level) => {
          const { hasUnlocked, isFullyUnlocked } = getLevelStatus(
            racialSkill,
            level,
            unlockedSkills
          );

          return (
            <div
              key={level}
              className="rounded-full border-2 border-white transition-colors hover:opacity-80"
              style={{
                ...SKILL_SIZES.racialSkill,
                backgroundColor: isFullyUnlocked
                  ? SKILL_COLORS.unlocked
                  : SKILL_COLORS.centralLocked,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              title={`${racialSkill.name} - ${LEVEL_NAMES[level]}${
                isFullyUnlocked
                  ? " (Повністю прокачано)"
                  : hasUnlocked
                  ? " (Частково прокачано)"
                  : " (Не прокачано)"
              }`}
            >
              {isFullyUnlocked && (
                <span className="text-white text-xs font-bold">✓</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
