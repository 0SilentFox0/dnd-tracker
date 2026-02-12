/**
 * Моки даних для дерев прокачки
 */

import type { MainSkill as MainSkillType } from "@/types/main-skills";
import type {
  MainSkill,
  Skill,
  SkillTree,
  UltimateSkill,
} from "@/types/skill-tree";
import {
  SkillCircle as SkillCircleEnum,
  SkillLevel,
} from "@/types/skill-tree";

// Генерація мокових навиків для основного навику (експорт для додавання відсутніх секторів)
export function generateSkillsForMainSkill(
  mainSkillId: string,
  mainSkillName: string
): MainSkill["levels"] {
  const levelNames: Record<SkillLevel, string> = {
    [SkillLevel.BASIC]: "Основи",
    [SkillLevel.ADVANCED]: "Просунутий",
    [SkillLevel.EXPERT]: "Експертний",
  };

  const circleNames: Record<SkillCircleEnum, string> = {
    [SkillCircleEnum.INNER]: "I",
    [SkillCircleEnum.MIDDLE]: "II",
    [SkillCircleEnum.OUTER]: "III",
  };

  const generateSkill = (
    circle: SkillCircleEnum, // circle1, circle2, circle3 в структурі
    level: SkillLevel,
    index: number
  ): Skill => {
    // Мапінг: circle3 → коло OUTER (3), circle2 → коло MIDDLE (2), circle1 → коло INNER (1)
    const skillCircle: SkillCircleEnum = circle;

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
      circle1: [generateSkill(SkillCircleEnum.INNER, SkillLevel.BASIC, 1)],
      circle2: [
        generateSkill(SkillCircleEnum.MIDDLE, SkillLevel.BASIC, 1),
        generateSkill(SkillCircleEnum.MIDDLE, SkillLevel.BASIC, 2),
      ],
      circle3: [
        generateSkill(SkillCircleEnum.OUTER, SkillLevel.BASIC, 1),
        generateSkill(SkillCircleEnum.OUTER, SkillLevel.BASIC, 2),
        generateSkill(SkillCircleEnum.OUTER, SkillLevel.BASIC, 3),
      ],
    },
    [SkillLevel.ADVANCED]: {
      circle1: [generateSkill(SkillCircleEnum.INNER, SkillLevel.ADVANCED, 1)],
      circle2: [
        generateSkill(SkillCircleEnum.MIDDLE, SkillLevel.ADVANCED, 1),
        generateSkill(SkillCircleEnum.MIDDLE, SkillLevel.ADVANCED, 2),
      ],
      circle3: [
        generateSkill(SkillCircleEnum.OUTER, SkillLevel.ADVANCED, 1),
        generateSkill(SkillCircleEnum.OUTER, SkillLevel.ADVANCED, 2),
        generateSkill(SkillCircleEnum.OUTER, SkillLevel.ADVANCED, 3),
      ],
    },
    [SkillLevel.EXPERT]: {
      circle1: [generateSkill(SkillCircleEnum.INNER, SkillLevel.EXPERT, 1)],
      circle2: [
        generateSkill(SkillCircleEnum.MIDDLE, SkillLevel.EXPERT, 1),
        generateSkill(SkillCircleEnum.MIDDLE, SkillLevel.EXPERT, 2),
      ],
      circle3: [
        generateSkill(SkillCircleEnum.OUTER, SkillLevel.EXPERT, 1),
        generateSkill(SkillCircleEnum.OUTER, SkillLevel.EXPERT, 2),
        generateSkill(SkillCircleEnum.OUTER, SkillLevel.EXPERT, 3),
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

/** Створює один MainSkill у форматі дерева з даних API (для додавання відсутніх секторів раси). */
export function createMainSkillFromApi(ms: MainSkillType): MainSkill {
  const skills = generateSkillsForMainSkill(ms.id, ms.name);

  const skillsWithPrerequisites = addPrerequisites(skills);

  return {
    id: ms.id,
    name: ms.name,
    color: ms.color,
    levels: skillsWithPrerequisites,
    ...(ms.isEnableInSkillTree !== undefined && { isEnableInSkillTree: ms.isEnableInSkillTree }),
    ...(ms.spellGroupId && { spellGroupId: ms.spellGroupId }),
  };
}

// Створюємо мокове дерево прокачки для раси
export function createMockSkillTree(
  campaignId: string,
  race: string,
  mainSkillsData?: MainSkillType[]
): SkillTree {
  // Якщо передано mainSkillsData, використовуємо їх, інакше створюємо дефолтні
  const defaultMainSkills: MainSkillType[] = [
    { id: "attack", name: "Напад", color: "rgba(217, 78, 74, 1)", campaignId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: "defense", name: "Захист", color: "darkblue", campaignId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: "archery", name: "Стрільба", color: "forestgreen", campaignId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: "leadership", name: "Лідерство", color: "sandybrown", campaignId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: "learning", name: "Навчання", color: "gainsboro", campaignId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: "sorcery", name: "Чародійство", color: "#ae2978", campaignId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: "light_magic", name: "Світла магія", color: "yellow", campaignId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: "dark_magic", name: "Темна магія", color: "darkred", campaignId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: "chaos_magic", name: "Магія Хаосу", color: "dodgerblue", campaignId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: "summoning_magic", name: "Магія Призиву", color: "sandybrown", campaignId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: "racial", name: "Рассовий Навик", color: "gainsboro", campaignId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ];
  
  const skillsToUse = mainSkillsData || defaultMainSkills;

  // Завжди додаємо расовий навик, якщо його немає в списку (для 3 кіл на сторінці skill tree)
  const skillsWithRacial =
    skillsToUse.some((ms) => ms.id === "racial")
      ? skillsToUse
      : [
          ...skillsToUse,
          {
            id: "racial",
            name: "Раса",
            color: "gainsboro",
            campaignId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as MainSkillType,
        ];

  // Зберігаємо порядок з mainSkillsData (якщо передано), інакше використовуємо порядок defaultMainSkills
  // Це важливо для правильного відображення кольорів секторів
  const mainSkills: MainSkill[] = skillsWithRacial.map((ms) => {
    const skills = generateSkillsForMainSkill(ms.id, ms.name);

    const skillsWithPrerequisites = addPrerequisites(skills);

    return {
      id: ms.id,
      name: ms.name,
      color: ms.color,
      levels: skillsWithPrerequisites,
      ...(ms.isEnableInSkillTree !== undefined && { isEnableInSkillTree: ms.isEnableInSkillTree }),
      ...(ms.spellGroupId && { spellGroupId: ms.spellGroupId }),
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

/** Конвертує дерево з Prisma (skills: Json) у тип SkillTree. */
export function convertPrismaToSkillTree(prismaTree: {
  id: string;
  campaignId: string;
  race: string;
  skills: unknown;
  createdAt: Date;
}): SkillTree | null {
  try {
    const skillsData = prismaTree.skills as
      | SkillTree
      | { mainSkills?: SkillTree["mainSkills"] };

    if ((skillsData as SkillTree).mainSkills) {
      return skillsData as SkillTree;
    }

    const data = skillsData as {
      mainSkills?: SkillTree["mainSkills"];
      ultimateSkill?: SkillTree["ultimateSkill"];
    };

    if (data.mainSkills) {
      return {
        id: prismaTree.id,
        campaignId: prismaTree.campaignId,
        race: prismaTree.race,
        mainSkills: data.mainSkills,
        centralSkills: [],
        ultimateSkill:
          data.ultimateSkill ||
          ({
            id: `${prismaTree.race}_ultimate`,
            name: "Ультимативний навик",
            description:
              "Могутній навик, доступний після вивчення 3 навиків з кола 2",
          } as UltimateSkill),
        createdAt: prismaTree.createdAt,
      };
    }
  } catch (error) {
    console.error("Error converting skill tree:", error);
  }

  return null;
}
