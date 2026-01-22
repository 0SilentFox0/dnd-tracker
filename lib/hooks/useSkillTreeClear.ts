import type { SkillTree, MainSkill } from "@/types/skill-tree";
import { SkillLevel, SkillCircle as SkillCircleEnum } from "@/types/skill-tree";

export function clearSkillTree(treeToClear: SkillTree): SkillTree {
  // Очищаємо всі присвоєння скілів, залишаючи структуру дерева
  const clearedMainSkills = treeToClear.mainSkills.map((mainSkill) => {
    // Очищаємо levelIcons та levelSkillIds для main-skill-level та racial
    const clearedLevelIcons: Record<string, string> = {};
    const clearedLevelSkillIds: Record<string, string> = {};

    // Очищаємо всі скіли в колах, замінюючи їх на placeholder'и
    const clearedLevels = Object.entries(mainSkill.levels).reduce(
      (acc, [levelKey, levelCircles]) => {
        const clearedCircles = {
          circle1: levelCircles.circle1.map((_, index) => ({
            id: `placeholder_${mainSkill.id}_${levelKey}_circle1_${index}`,
            name: "",
            description: "",
            circle: SkillCircleEnum.INNER,
            level: levelKey as SkillLevel,
          })),
          circle2: levelCircles.circle2.map((_, index) => ({
            id: `placeholder_${mainSkill.id}_${levelKey}_circle2_${index}`,
            name: "",
            description: "",
            circle: SkillCircleEnum.MIDDLE,
            level: levelKey as SkillLevel,
          })),
          circle3: levelCircles.circle3.map((_, index) => ({
            id: `placeholder_${mainSkill.id}_${levelKey}_circle3_${index}`,
            name: "",
            description: "",
            circle: SkillCircleEnum.OUTER,
            level: levelKey as SkillLevel,
          })),
        };
        return {
          ...acc,
          [levelKey]: clearedCircles,
        };
      },
      {} as MainSkill["levels"]
    );

    return {
      ...mainSkill,
      levelIcons: clearedLevelIcons,
      levelSkillIds: clearedLevelSkillIds,
      levels: clearedLevels,
    };
  });

  return {
    ...treeToClear,
    mainSkills: clearedMainSkills,
  };
}
