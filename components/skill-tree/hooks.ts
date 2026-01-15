import { useMemo } from "react";
import type { SkillTree, Skill, MainSkill } from "@/lib/types/skill-tree";
import { RACE_MAGIC } from "@/lib/types/skill-tree";

// Хук для фільтрації основних навиків
export function useAvailableMainSkills(skillTree: SkillTree) {
  return useMemo(() => {
    return skillTree.mainSkills.filter((ms) => {
      // Виключаємо расовий навик, удачу та логістику
      if (ms.id === "racial" || ms.id === "luck" || ms.id === "logistics") {
        return false;
      }
      // Магія доступна залежно від раси
      if (ms.id === "light_magic") {
        return RACE_MAGIC[skillTree.race]?.includes("light") ?? false;
      }
      if (ms.id === "dark_magic") {
        return RACE_MAGIC[skillTree.race]?.includes("dark") ?? false;
      }
      if (ms.id === "chaos_magic") {
        return RACE_MAGIC[skillTree.race]?.includes("chaos") ?? false;
      }
      if (ms.id === "summoning_magic") {
        return RACE_MAGIC[skillTree.race]?.includes("summoning") ?? false;
      }
      // Всі інші навики доступні
      return true;
    });
  }, [skillTree]);
}

// Хук для отримання расового навику
export function useRacialSkill(skillTree: SkillTree) {
  return useMemo(() => {
    return skillTree.mainSkills.find((ms) => ms.id === "racial") || null;
  }, [skillTree]);
}

// Утиліта для отримання всіх навиків з основного навику
export function getAllSkillsFromMainSkill(mainSkill: MainSkill): Skill[] {
  return [
    ...mainSkill.levels.basic.circle1,
    ...mainSkill.levels.basic.circle2,
    ...mainSkill.levels.basic.circle3,
    ...mainSkill.levels.advanced.circle1,
    ...mainSkill.levels.advanced.circle2,
    ...mainSkill.levels.advanced.circle3,
    ...mainSkill.levels.expert.circle1,
    ...mainSkill.levels.expert.circle2,
    ...mainSkill.levels.expert.circle3,
  ];
}

// Утиліта для перевірки чи навик розблокований
export function isSkillUnlocked(
  skill: Skill,
  unlockedSkills: string[]
): boolean {
  if (!skill.prerequisites || skill.prerequisites.length === 0) {
    return true; // Навики без вимог доступні відразу
  }
  return skill.prerequisites.every((prereq) =>
    unlockedSkills.includes(prereq)
  );
}

// Утиліта для перевірки чи можна вивчити навик
export function canLearnSkill(
  skill: Skill,
  unlockedSkills: string[]
): boolean {
  return (
    isSkillUnlocked(skill, unlockedSkills) &&
    !unlockedSkills.includes(skill.id)
  );
}

// Утиліта для перевірки чи основний навик повністю прокачений
export function isMainSkillFullyUnlocked(
  mainSkill: MainSkill,
  unlockedSkills: string[]
): boolean {
  const allSkills = getAllSkillsFromMainSkill(mainSkill);
  return allSkills.every((skill) => unlockedSkills.includes(skill.id));
}

// Утиліта для отримання статусу рівня навику
export function getLevelStatus(
  mainSkill: MainSkill,
  level: "basic" | "advanced" | "expert",
  unlockedSkills: string[]
) {
  const levelSkills = mainSkill.levels[level];
  const allLevelSkills = [
    ...levelSkills.circle1,
    ...levelSkills.circle2,
    ...levelSkills.circle3,
  ];
  const hasUnlocked = allLevelSkills.some((s) =>
    unlockedSkills.includes(s.id)
  );
  const isFullyUnlocked = allLevelSkills.every((s) =>
    unlockedSkills.includes(s.id)
  );
  return { hasUnlocked, isFullyUnlocked };
}
