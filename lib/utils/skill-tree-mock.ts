/**
 * Моки даних для дерев прокачки
 */

import type {
  SkillTree,
  MainSkill,
  Skill,
  UltimateSkill,
} from "@/lib/types/skill-tree";
import { MAIN_SKILLS, SkillLevel } from "@/lib/types/skill-tree";

// Генерація мокових навиків для основного навику
function generateSkillsForMainSkill(
  mainSkillId: string,
  mainSkillName: string
): MainSkill["levels"] {
  const levelNames: Record<SkillLevel, string> = {
    [SkillLevel.BASIC]: "Основи",
    [SkillLevel.ADVANCED]: "Просунутий",
    [SkillLevel.EXPERT]: "Експертний",
  };

  const circleNames: Record<1 | 2 | 3, string> = {
    1: "I",
    2: "II",
    3: "III",
  };

  const generateSkill = (
    circle: 1 | 2 | 3, // circle1, circle2, circle3 в структурі
    level: SkillLevel,
    index: number
  ): Skill => {
    // Мапінг: circle3 → коло 3, circle2 → коло 2, circle1 → коло 1
    const skillCircle: 1 | 2 | 3 = circle;
    return {
      id: `${mainSkillId}_${level}_circle${circle}_skill${index}`,
      name: `${mainSkillName} ${levelNames[level]} ${circleNames[skillCircle]}-${index}`,
      description: `Опис навики ${mainSkillName} рівня ${level} кола ${skillCircle} навик ${index}`,
      circle: skillCircle,
      level,
    };
  };

  return {
    [SkillLevel.BASIC]: {
      circle1: [generateSkill(1, SkillLevel.BASIC, 1)],
      circle2: [
        generateSkill(2, SkillLevel.BASIC, 1),
        generateSkill(2, SkillLevel.BASIC, 2),
      ],
      circle3: [
        generateSkill(3, SkillLevel.BASIC, 1),
        generateSkill(3, SkillLevel.BASIC, 2),
        generateSkill(3, SkillLevel.BASIC, 3),
      ],
    },
    [SkillLevel.ADVANCED]: {
      circle1: [generateSkill(1, SkillLevel.ADVANCED, 1)],
      circle2: [
        generateSkill(2, SkillLevel.ADVANCED, 1),
        generateSkill(2, SkillLevel.ADVANCED, 2),
      ],
      circle3: [
        generateSkill(3, SkillLevel.ADVANCED, 1),
        generateSkill(3, SkillLevel.ADVANCED, 2),
        generateSkill(3, SkillLevel.ADVANCED, 3),
      ],
    },
    [SkillLevel.EXPERT]: {
      circle1: [generateSkill(1, SkillLevel.EXPERT, 1)],
      circle2: [
        generateSkill(2, SkillLevel.EXPERT, 1),
        generateSkill(2, SkillLevel.EXPERT, 2),
      ],
      circle3: [
        generateSkill(3, SkillLevel.EXPERT, 1),
        generateSkill(3, SkillLevel.EXPERT, 2),
        generateSkill(3, SkillLevel.EXPERT, 3),
      ],
    },
  };
}

// Додаємо вимоги для навиків
function addPrerequisites(skills: MainSkill["levels"]): MainSkill["levels"] {
  // Коло 3 (circle3) - доступне відразу, без prerequisites
  // Коло 2 (circle2) - доступне після прокачки 1 з кола 3 (глобальна перевірка, не prerequisites)
  // Коло 1 (circle1) - доступне після прокачки 2 з кола 3 (глобальна перевірка, не prerequisites)

  // Prerequisites залишаються порожніми, доступність контролюється через canLearnSkill

  // Для advanced та expert рівнів доступність також контролюється через глобальну перевірку
  // Prerequisites не потрібні, доступність залежить від кількості прокачаних навиків з кола 3

  // Для просунутого та експертного рівнів prerequisites можуть бути додані окремо
  // якщо потрібна послідовність прокачки між рівнями

  return skills;
}

// Створюємо мокове дерево прокачки для раси
export function createMockSkillTree(
  campaignId: string,
  race: string
): SkillTree {
  const mainSkills: MainSkill[] = MAIN_SKILLS.map((ms) => {
    const skills = generateSkillsForMainSkill(ms.id, ms.name);
    const skillsWithPrerequisites = addPrerequisites(skills);

    return {
      id: ms.id,
      name: ms.name,
      color: ms.color,
      levels: skillsWithPrerequisites,
    };
  });

  // Ультимативний навик (доступний після вивчення 3 навиків з кола 1)
  const ultimateSkill: UltimateSkill = {
    id: `${race}_ultimate`,
    name: "Ультимативний навик",
    description: "Могутній навик, доступний після вивчення 3 навиків з кола 2",
  };

  return {
    id: `mock-${race}-${campaignId}`,
    campaignId,
    race,
    mainSkills,
    centralSkills: [],
    ultimateSkill,
    createdAt: new Date(),
  };
}
