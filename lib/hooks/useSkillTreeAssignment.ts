import type { SkillTree, Skill, SkillLevel, SkillCircle } from "@/types/skill-tree";
import { SkillLevel as SkillLevelEnum, SkillCircle as SkillCircleEnum } from "@/types/skill-tree";
import type { Skill as SkillFromLibraryType } from "@/types/skills";

interface SkillSlot {
  mainSkillId: string;
  circle: 1 | 2 | 3;
  level: string;
  index: number;
}

export function assignSkillToSlot(
  skillTree: SkillTree,
  slot: SkillSlot,
  selectedSkill: SkillFromLibraryType
): SkillTree {
  // Перевіряємо, чи це main-skill-level або racial слот (circle === 1 та index === 0)
  const isMainSkillLevelOrRacial = slot.circle === 1 && slot.index === 0;

  // Для main-skill-level та racial оновлюємо icon для конкретного рівня
  if (isMainSkillLevelOrRacial) {
    const updatedMainSkills = skillTree.mainSkills.map((mainSkill) => {
      if (mainSkill.id !== slot.mainSkillId) {
        return mainSkill;
      }

      // Оновлюємо icon та skillId для конкретного рівня
      const levelIcons = mainSkill.levelIcons || {};
      const levelSkillIds = mainSkill.levelSkillIds || {};
      return {
        ...mainSkill,
        levelIcons: {
          ...levelIcons,
          [slot.level]:
            selectedSkill.icon ||
            levelIcons[slot.level as keyof typeof levelIcons],
        },
        levelSkillIds: {
          ...levelSkillIds,
          [slot.level]: selectedSkill.id,
        },
      };
    });

    return {
      ...skillTree,
      mainSkills: updatedMainSkills,
    };
  }

  // Оновлюємо skillTree, призначаючи скіл до відповідного слота
  const updatedMainSkills = skillTree.mainSkills.map((mainSkill) => {
    if (mainSkill.id !== slot.mainSkillId) {
      return mainSkill;
    }

    // Оновлюємо рівень, де знаходиться слот
    const updatedLevels = { ...mainSkill.levels };
    const levelKey = slot.level as SkillLevel;
    const levelCircles = updatedLevels[levelKey];

    // Мапінг між UI колами та структурою даних:
    // UI коло 3 -> circle3, UI коло 2 -> circle2, UI коло 1 -> circle1
    const circleMapping: Record<
      1 | 2 | 3,
      "circle1" | "circle2" | "circle3"
    > = {
      1: "circle1",
      2: "circle2",
      3: "circle3",
    };
    const circleKey = circleMapping[slot.circle] as keyof typeof levelCircles;
    const circleSkills = levelCircles[circleKey] || [];

    // Створюємо новий масив скілів з оновленим скілом на позиції slot.index
    const updatedCircleSkills = [...circleSkills];
    const skillToAssign: Skill = {
      id: selectedSkill.id,
      name: selectedSkill.name,
      description: selectedSkill.description || "",
      circle: slot.circle as SkillCircle,
      level: slot.level as SkillLevel,
      ...(selectedSkill.icon && { icon: selectedSkill.icon }),
    };

    // Замінюємо скіл на позиції slot.index
    // Якщо індекс більший за довжину масиву, заповнюємо масив до потрібного індексу placeholder'ами
    // Але зберігаємо всі існуючі скіли
    while (updatedCircleSkills.length <= slot.index) {
      // Створюємо порожній скіл-заглушку для заповнення масиву
      const placeholderSkill: Skill = {
        id: `placeholder_${updatedCircleSkills.length}`,
        name: "",
        description: "",
        circle: slot.circle as SkillCircle,
        level: slot.level as SkillLevel,
      };
      updatedCircleSkills.push(placeholderSkill);
    }
    // Тепер замінюємо скіл на позиції slot.index
    updatedCircleSkills[slot.index] = skillToAssign;

    updatedLevels[levelKey] = {
      ...levelCircles,
      [circleKey]: updatedCircleSkills,
    };

    return {
      ...mainSkill,
      levels: updatedLevels,
    };
  });

  // Оновлюємо skillTree
  return {
    id: skillTree.id,
    campaignId: skillTree.campaignId,
    race: skillTree.race,
    mainSkills: updatedMainSkills,
    centralSkills: skillTree.centralSkills || [],
    ultimateSkill: skillTree.ultimateSkill,
    createdAt: skillTree.createdAt,
  };
}
