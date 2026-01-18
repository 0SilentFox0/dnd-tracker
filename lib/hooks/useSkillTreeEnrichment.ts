import { useMemo } from "react";
import type { SkillTree, Skill } from "@/lib/types/skill-tree";
import type { Skill as SkillFromLibraryType } from "@/lib/types/skills";

interface UseSkillTreeEnrichmentOptions {
  skillTree: SkillTree | null;
  skillsFromLibrary: SkillFromLibraryType[];
}

export function useSkillTreeEnrichment({
  skillTree,
  skillsFromLibrary,
}: UseSkillTreeEnrichmentOptions): SkillTree | null {
  return useMemo(() => {
    if (!skillTree || !skillsFromLibrary.length) {
      return skillTree;
    }

    // Створюємо Map для швидкого пошуку скілів з бібліотеки
    const skillsMap = new Map(skillsFromLibrary.map((s) => [s.id, s]));

    // Клонуємо дерево та обогачуємо скіли даними з бібліотеки
    const enrichedMainSkills = skillTree.mainSkills.map((mainSkill) => {
      const enrichedLevels = { ...mainSkill.levels };

      // Обогачуємо скіли на всіх рівнях
      Object.keys(enrichedLevels).forEach((levelKey) => {
        const level = enrichedLevels[levelKey as keyof typeof enrichedLevels];
        const enrichedCircles = { ...level };

        Object.keys(enrichedCircles).forEach((circleKey) => {
          const circleSkills =
            enrichedCircles[circleKey as keyof typeof enrichedCircles];
          const enrichedCircleSkills = circleSkills.map((skill) => {
            const skillWithIcon = skill as Skill & { icon?: string };

            // Якщо скіл має id з бібліотеки, обогачуємо його даними з бібліотеки
            if (skill.id && skillsMap.has(skill.id)) {
              const librarySkill = skillsMap.get(
                skill.id
              )! as SkillFromLibraryType;
              const enrichedSkill: Skill = {
                id: skill.id,
                name: skill.name,
                description: librarySkill.description || skill.description,
                circle: skill.circle,
                level: skill.level,
                ...(skillWithIcon.icon 
                  ? { icon: skillWithIcon.icon } 
                  : librarySkill.icon 
                    ? { icon: librarySkill.icon } 
                    : {}),
              };
              return enrichedSkill;
            }

            // Якщо скіл не з бібліотеки, але має icon (був присвоєний), зберігаємо його
            if (skillWithIcon.icon) {
              return skill;
            }

            return skill;
          });

          enrichedCircles[circleKey as keyof typeof enrichedCircles] =
            enrichedCircleSkills;
        });

        enrichedLevels[levelKey as keyof typeof enrichedLevels] =
          enrichedCircles;
      });

      return {
        ...mainSkill,
        levels: enrichedLevels,
      };
    });

    return {
      ...skillTree,
      mainSkills: enrichedMainSkills,
    };
  }, [skillTree, skillsFromLibrary]);
}
