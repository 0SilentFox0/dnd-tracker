/**
 * Моки даних для дерев прокачки
 */

import type {
  SkillTree,
  MainSkill,
  Skill,
  CentralSkill,
  UltimateSkill,
} from "@/lib/types/skill-tree";
import { MAIN_SKILLS } from "@/lib/types/skill-tree";

// Генерація мокових навиків для основного навику
function generateSkillsForMainSkill(
  mainSkillId: string,
  mainSkillName: string
): MainSkill["levels"] {
  const generateSkill = (
    circle: 1 | 2 | 3,
    level: "basic" | "advanced" | "expert",
    index: number
  ): Skill => ({
    id: `${mainSkillId}_${level}_circle${circle}_skill${index}`,
    name: `${mainSkillName} ${level === "basic" ? "Основи" : level === "advanced" ? "Просунутий" : "Експертний"} ${circle === 1 ? "I" : circle === 2 ? "II" : "III"}-${index}`,
    description: `Опис навики ${mainSkillName} рівня ${level} кола ${circle} навик ${index}`,
    circle,
    level,
  });

  return {
    basic: {
      circle1: [generateSkill(1, "basic", 1)],
      circle2: [
        generateSkill(2, "basic", 1),
        generateSkill(2, "basic", 2),
      ],
      circle3: [
        generateSkill(3, "basic", 1),
        generateSkill(3, "basic", 2),
        generateSkill(3, "basic", 3),
      ],
    },
    advanced: {
      circle1: [generateSkill(1, "advanced", 1)],
      circle2: [
        generateSkill(2, "advanced", 1),
        generateSkill(2, "advanced", 2),
      ],
      circle3: [
        generateSkill(3, "advanced", 1),
        generateSkill(3, "advanced", 2),
        generateSkill(3, "advanced", 3),
      ],
    },
    expert: {
      circle1: [generateSkill(1, "expert", 1)],
      circle2: [
        generateSkill(2, "expert", 1),
        generateSkill(2, "expert", 2),
      ],
      circle3: [
        generateSkill(3, "expert", 1),
        generateSkill(3, "expert", 2),
        generateSkill(3, "expert", 3),
      ],
    },
  };
}

// Додаємо вимоги для навиків
function addPrerequisites(skills: MainSkill["levels"]): MainSkill["levels"] {
  // Для кола 2 базового рівня потрібно 2 навики з кола 1
  skills.basic.circle2.forEach((skill, index) => {
    if (index < skills.basic.circle1.length) {
      skill.prerequisites = [skills.basic.circle1[0].id];
    } else {
      skill.prerequisites = skills.basic.circle1.map((s) => s.id);
    }
  });

  // Для кола 3 базового рівня потрібні всі навики з кола 1 і 2
  skills.basic.circle3.forEach((skill) => {
    skill.prerequisites = [
      ...skills.basic.circle1.map((s) => s.id),
      ...skills.basic.circle2.map((s) => s.id),
    ];
  });

  // Аналогічно для просунутого рівня
  skills.advanced.circle2.forEach((skill, index) => {
    if (index < skills.advanced.circle1.length) {
      skill.prerequisites = [skills.advanced.circle1[0].id];
    } else {
      skill.prerequisites = skills.advanced.circle1.map((s) => s.id);
    }
  });

  skills.advanced.circle3.forEach((skill) => {
    skill.prerequisites = [
      ...skills.advanced.circle1.map((s) => s.id),
      ...skills.advanced.circle2.map((s) => s.id),
    ];
  });

  // Аналогічно для експертного рівня
  skills.expert.circle2.forEach((skill, index) => {
    if (index < skills.expert.circle1.length) {
      skill.prerequisites = [skills.expert.circle1[0].id];
    } else {
      skill.prerequisites = skills.expert.circle1.map((s) => s.id);
    }
  });

  skills.expert.circle3.forEach((skill) => {
    skill.prerequisites = [
      ...skills.expert.circle1.map((s) => s.id),
      ...skills.expert.circle2.map((s) => s.id),
    ];
  });

  // Для просунутого рівня потрібен базовий рівень
  skills.advanced.circle1[0].prerequisites = [
    ...skills.basic.circle1.map((s) => s.id),
    ...skills.basic.circle2.map((s) => s.id),
    ...skills.basic.circle3.map((s) => s.id),
  ];

  // Для експертного рівня потрібен просунутий рівень
  skills.expert.circle1[0].prerequisites = [
    ...skills.advanced.circle1.map((s) => s.id),
    ...skills.advanced.circle2.map((s) => s.id),
    ...skills.advanced.circle3.map((s) => s.id),
  ];

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

  // Створюємо 4 центральні навики (вимагають повного прокачування основних навиків)
  const centralSkills: CentralSkill[] = [
    {
      id: `${race}_central_1`,
      name: "Центральний навик I",
      description: "Вимагає повного прокачування навику Напад",
      requiredMainSkillId: "attack",
    },
    {
      id: `${race}_central_2`,
      name: "Центральний навик II",
      description: "Вимагає повного прокачування навику Захист",
      requiredMainSkillId: "defense",
    },
    {
      id: `${race}_central_3`,
      name: "Центральний навик III",
      description: "Вимагає повного прокачування навику Лідерство",
      requiredMainSkillId: "leadership",
    },
    {
      id: `${race}_central_4`,
      name: "Центральний навик IV",
      description: "Вимагає повного прокачування навику Чародійство",
      requiredMainSkillId: "sorcery",
    },
  ];

  // Ультимативний навик (вимагає 3 з 4 центральних навиків)
  const ultimateSkill: UltimateSkill = {
    id: `${race}_ultimate`,
    name: "Ультимативний навик",
    description: "Могутній навик, доступний після вивчення 3 центральних навиків",
    requiredCentralSkillIds: [
      centralSkills[0].id,
      centralSkills[1].id,
      centralSkills[2].id,
    ],
  };

  return {
    id: `mock-${race}-${campaignId}`,
    campaignId,
    race,
    mainSkills,
    centralSkills,
    ultimateSkill,
    createdAt: new Date(),
  };
}
