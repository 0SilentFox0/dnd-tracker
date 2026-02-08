import {
  getSkillDescription,
  getSkillIcon,
  getSkillName,
} from "@/lib/utils/skills/skill-helpers";
import type { Skill, SkillCircle, SkillLevel, SkillTree } from "@/types/skill-tree";
import type { GroupedSkill, Skill as SkillFromLibraryType } from "@/types/skills";

interface SkillSlot {
  mainSkillId: string;
  circle: 1 | 2 | 3;
  level: string;
  index: number;
  /** true для слоту data-skill-type="main-skill-level" (присвоєння скіла рівню basic/advanced/expert) */
  isMainSkillLevel?: boolean;
  /** true для расового слоту */
  isRacial?: boolean;
  /** true для слоту data-skill-type="ultimate" */
  isUltimate?: boolean;
}

export function assignSkillToSlot(
  skillTree: SkillTree,
  slot: SkillSlot,
  selectedSkill: SkillFromLibraryType | GroupedSkill
): SkillTree {
  const skillName = getSkillName(selectedSkill);
  const skillDescription = getSkillDescription(selectedSkill) ?? "";
  const skillIcon = getSkillIcon(selectedSkill);

  // Слот ультимату — оновлюємо skillTree.ultimateSkill
  if (slot.isUltimate === true) {
    return {
      ...skillTree,
      ultimateSkill: {
        id: selectedSkill.id,
        name: skillName,
        description: skillDescription,
        ...(skillIcon && { icon: skillIcon }),
      },
    };
  }

  // Розрізняємо main-skill-level/racial від звичайного кола 1 (INNER): тільки явний прапорець
  const isMainSkillLevelOrRacial =
    slot.isMainSkillLevel === true || slot.isRacial === true;

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
            skillIcon ||
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
      name: skillName,
      description: skillDescription,
      circle: slot.circle as SkillCircle,
      level: slot.level as SkillLevel,
      ...(skillIcon && { icon: skillIcon }),
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
