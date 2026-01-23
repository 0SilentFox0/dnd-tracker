import { useMemo } from "react";

import type { Race } from "@/types/races";
import type { MainSkill,Skill, SkillTree } from "@/types/skill-tree";
import {
  SKILL_LEVELS,
  SkillCircle as SkillCircleEnum,
  SkillLevel,
} from "@/types/skill-tree";

// Хук для фільтрації основних навиків
export function useAvailableMainSkills(
  skillTree: SkillTree,
  race?: Race | null
) {
  return useMemo(() => {
    // Отримуємо доступні навики з налаштувань раси
    const availableSkills = race
      ? Array.isArray(race.availableSkills)
        ? race.availableSkills
        : []
      : [];

    // Зберігаємо оригінальний порядок з skillTree.mainSkills
    // Фільтруємо, але зберігаємо порядок елементів
    const filtered = skillTree.mainSkills
      .filter((ms) => {
        // Виключаємо расовий навик
        if (ms.id === "racial") {
          return false;
        }

        // Якщо є налаштування раси з availableSkills, показуємо тільки доступні
        // Всі невказані автоматично недоступні
        if (availableSkills.length > 0) {
          return availableSkills.includes(ms.id);
        }

        // Якщо немає налаштувань раси (порожній масив), всі навики доступні
        return true;
      })
      // Сортуємо за оригінальним порядком з skillTree.mainSkills
      .sort((a, b) => {
        const indexA = skillTree.mainSkills.findIndex((ms) => ms.id === a.id);

        const indexB = skillTree.mainSkills.findIndex((ms) => ms.id === b.id);

        return indexA - indexB;
      });

    return filtered;
  }, [skillTree, race]);
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

  return skill.prerequisites.every((prereq) => unlockedSkills.includes(prereq));
}

// Утиліта для підрахунку прокачаних навиків з кола 3 (зовнішнє коло, початок прокачки)
export function getCircle4UnlockedCount(
  skillTree: SkillTree,
  unlockedSkills: string[]
): number {
  let count = 0;

  skillTree.mainSkills.forEach((mainSkill) => {
    // Перевіряємо всі рівні кола 3 (circle3 в структурі)
    SKILL_LEVELS.forEach((level) => {
      const levelSkills = mainSkill.levels[level];

      levelSkills.circle3.forEach((skill) => {
        if (unlockedSkills.includes(skill.id)) {
          count++;
        }
      });
    });
  });

  return count;
}

// Утиліта для підрахунку прокачаних навиків з кола 2 (внутрішнє коло)
export function getCircle2UnlockedCount(
  skillTree: SkillTree,
  unlockedSkills: string[]
): number {
  let count = 0;

  skillTree.mainSkills.forEach((mainSkill) => {
    // Перевіряємо всі рівні кола 2 (circle1 в структурі)
    SKILL_LEVELS.forEach((level) => {
      const levelSkills = mainSkill.levels[level];

      levelSkills.circle1.forEach((skill) => {
        if (unlockedSkills.includes(skill.id)) {
          count++;
        }
      });
    });
  });

  return count;
}

// Утиліта для перевірки чи можна вивчити навик
export function canLearnSkill(
  skill: Skill,
  unlockedSkills: string[],
  skillTree?: SkillTree
): boolean {
  // Перевіряємо чи навик вже вивчений
  if (unlockedSkills.includes(skill.id)) {
    return false;
  }

  // Перевіряємо prerequisites
  if (!isSkillUnlocked(skill, unlockedSkills)) {
    return false;
  }

  // Перевіряємо доступність на основі кола
  if (skillTree) {
    const circle4Count = getCircle4UnlockedCount(skillTree, unlockedSkills);

    // Коло OUTER (3) - доступне відразу (початок прокачки)
    if (skill.circle === SkillCircleEnum.OUTER) {
      return true;
    }

    // Коло MIDDLE (2) - доступне після прокачки 1 навики з кола OUTER (будь-якої)
    if (skill.circle === SkillCircleEnum.MIDDLE) {
      return circle4Count >= 1;
    }

    // Коло INNER (1) - доступне після прокачки 2 навик з кола OUTER
    if (skill.circle === SkillCircleEnum.INNER) {
      return circle4Count >= 2;
    }
  }

  return true;
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
  level: SkillLevel,
  unlockedSkills: string[]
) {
  const levelSkills = mainSkill.levels[level];

  const allLevelSkills = [
    ...levelSkills.circle1,
    ...levelSkills.circle2,
    ...levelSkills.circle3,
  ];

  const hasUnlocked = allLevelSkills.some((s) => unlockedSkills.includes(s.id));

  const isFullyUnlocked = allLevelSkills.every((s) =>
    unlockedSkills.includes(s.id)
  );

  return { hasUnlocked, isFullyUnlocked };
}

/**
 * Перевіряє чи можна прокачати рівень main-skill-level з урахуванням послідовності
 * Послідовність: basic -> advanced -> expert
 */
export function canLearnMainSkillLevel(
  level: SkillLevel,
  mainSkillId: string,
  unlockedSkills: string[]
): boolean {
  if (level === SkillLevel.BASIC) {
    return true; // basic можна прокачати завжди
  }

  const mainSkillLevelBasicId = `${mainSkillId}_${SkillLevel.BASIC}_level`;

  const mainSkillLevelAdvancedId = `${mainSkillId}_${SkillLevel.ADVANCED}_level`;

  if (level === SkillLevel.ADVANCED) {
    // advanced можна прокачати тільки якщо basic прокачаний
    return unlockedSkills.includes(mainSkillLevelBasicId);
  }

  if (level === SkillLevel.EXPERT) {
    // expert можна прокачати тільки якщо advanced прокачаний
    return unlockedSkills.includes(mainSkillLevelAdvancedId);
  }

  return false;
}

/**
 * Перевіряє чи можна прокачати рівень расового навику з урахуванням послідовності
 * Послідовність: basic -> advanced -> expert
 */
export function canLearnRacialSkillLevel(
  level: SkillLevel,
  racialSkillId: string,
  unlockedSkills: string[]
): boolean {
  if (level === SkillLevel.BASIC) {
    return true; // basic можна прокачати завжди
  }

  const racialSkillBasicId = `${racialSkillId}_${SkillLevel.BASIC}_racial`;

  const racialSkillAdvancedId = `${racialSkillId}_${SkillLevel.ADVANCED}_racial`;

  if (level === SkillLevel.ADVANCED) {
    // advanced можна прокачати тільки якщо basic прокачаний
    return unlockedSkills.includes(racialSkillBasicId);
  }

  if (level === SkillLevel.EXPERT) {
    // expert можна прокачати тільки якщо advanced прокачаний
    return unlockedSkills.includes(racialSkillAdvancedId);
  }

  return false;
}

/**
 * Створює ID для main-skill-level
 */
export function getMainSkillLevelId(
  mainSkillId: string,
  level: SkillLevel
): string {
  return `${mainSkillId}_${level}_level`;
}

/**
 * Створює ID для расового навику рівня
 */
export function getRacialSkillLevelId(
  racialSkillId: string,
  level: SkillLevel
): string {
  return `${racialSkillId}_${level}_racial`;
}
