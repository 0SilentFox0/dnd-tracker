import { useMemo } from "react";

import type { MainSkill } from "@/types/main-skills";
import type { Race } from "@/types/races";
import type { SkillTree } from "@/types/skill-tree";
import type { Skill as SkillFromLibraryType } from "@/types/skills";

interface UseSkillTreeFiltersOptions {
  skillTree: SkillTree | null;
  skillsFromLibrary: SkillFromLibraryType[];
  selectedRace: string;
  race?: Race | null;
  mainSkills?: MainSkill[];
}

export function useSkillTreeFilters({
  skillTree,
  skillsFromLibrary,
  selectedRace,
  race,
  mainSkills = [],
}: UseSkillTreeFiltersOptions) {
  // Отримуємо список вже присвоєних скілів для цієї раси
  const assignedSkillIds = useMemo(() => {
    if (!skillTree) return new Set<string>();

    const assignedIds = new Set<string>();

    // Проходимо по всіх mainSkills та їх рівнях
    skillTree.mainSkills.forEach((mainSkill) => {
      Object.values(mainSkill.levels).forEach((level) => {
        Object.values(level).forEach((circleSkills) => {
          circleSkills.forEach((skill) => {
            // Якщо скіл має id з бібліотеки (не моковий), додаємо його
            // Мокові скіли мають формат: ${mainSkillId}_${level}_circle${circle}_skill${index}
            // Скіли з бібліотеки мають просто id з бібліотеки
            if (
              skill.id &&
              !skill.id.includes("_circle") &&
              !skill.id.includes("_level") &&
              !skill.id.startsWith("placeholder_")
            ) {
              assignedIds.add(skill.id);
            }
          });
        });
      });

      // Також перевіряємо levelSkillIds для main-skill-level та racial
      if (mainSkill.levelSkillIds) {
        Object.values(mainSkill.levelSkillIds).forEach((skillId) => {
          if (skillId) {
            assignedIds.add(skillId);
          }
        });
      }
    });

    return assignedIds;
  }, [skillTree]);

  // Фільтруємо скіли: прибираємо вже присвоєні та фільтруємо по расам
  const availableSkills = useMemo(() => {
    console.log("Filtering skills:", {
      totalSkills: skillsFromLibrary.length,
      selectedRace,
      raceId: race?.id,
      raceName: race?.name,
    });
    
    if (!skillsFromLibrary.length) {
      console.warn("No skills in library to filter");

      return [];
    }

    const raceAvailableSkills = race?.availableSkills
      ? Array.isArray(race.availableSkills)
        ? race.availableSkills
        : []
      : null;

    if (raceAvailableSkills && raceAvailableSkills.length > 0) {
      // Раса має обмежений список доступних основних навиків
      console.log(`Race has ${raceAvailableSkills.length} available main skills`);
    }

    // Збираємо інформацію про відфільтровані скіли
    const excludedSkills: Array<{ name: string; reason: string }> = [];

    const filtered = skillsFromLibrary.filter((skill) => {
      // Перевіряємо чи скіл вже присвоєний
      if (assignedSkillIds.has(skill.id)) {
        excludedSkills.push({
          name: skill.name,
          reason: "вже присвоєний",
        });

        return false;
      }

      // Якщо раса має список availableSkills (доступних основних навиків),
      // показуємо тільки скіли, чий mainSkillId є в цьому списку
      // Скіли без mainSkillId перевіряються через skill.races
      if (raceAvailableSkills && raceAvailableSkills.length > 0) {
        const skillWithMainSkill = skill as unknown as {
          mainSkillId?: string | null;
        };

        const mainSkillId = skillWithMainSkill.mainSkillId;

        // Якщо скіл має mainSkillId, перевіряємо чи він в списку доступних
        if (mainSkillId) {
          const isInAvailableList = raceAvailableSkills.includes(mainSkillId);

          if (!isInAvailableList) {
            const mainSkillName =
              mainSkills.find((ms) => ms.id === mainSkillId)?.name ||
              mainSkillId;

            excludedSkills.push({
              name: skill.name,
              reason: `основний навик "${mainSkillName}" не доступний для цієї раси`,
            });

            return false;
          }
        }
        // Якщо скіл не має mainSkillId, пропускаємо перевірку availableSkills
        // і перевіряємо через skill.races нижче
      }

      // Перевіряємо чи скіл підходить для цієї раси (через skill.races)
      // skill.races може містити як ID рас, так і назви рас
      // selectedRace - це назва раси
      if (skill.races && skill.races.length > 0) {
        // Знаходимо ID та назву обраної раси
        const selectedRaceId = race?.id;

        const selectedRaceName = race?.name || selectedRace;
        
        // Перевіряємо чи ID раси або назва раси є в списку доступних для скіла
        const isAvailableForRace = 
          (selectedRaceId && skill.races.includes(selectedRaceId)) ||
          skill.races.includes(selectedRaceName) ||
          skill.races.includes(selectedRace);
        
        if (!isAvailableForRace) {
          excludedSkills.push({
            name: skill.name,
            reason: `не доступний для раси "${selectedRace}"`,
          });

          return false;
        }
      }

      // Якщо рас не вказано - показуємо для всіх
      return true;
    });

    // Виводимо список доступних скілів з назвами
    if (filtered.length > 0) {
      const availableSkillNames = filtered
        .map((s) => {
          const mainSkillId = (s as unknown as { mainSkillId?: string | null })
            .mainSkillId;

          const mainSkillName = mainSkillId
            ? mainSkills.find((ms) => ms.id === mainSkillId)?.name ||
              mainSkillId
            : "Без основного навику";

          return `${s.name} (${mainSkillName})`;
        })
        .join(", ");

      console.log(`Available skills (${filtered.length}):`, availableSkillNames);
    }

    // Виводимо список обмежених/виключених скілів
    if (excludedSkills.length > 0) {
      console.log(`Excluded skills (${excludedSkills.length}):`, excludedSkills.map(s => `${s.name} - ${s.reason}`).join(", "));
    }

    console.log(`Final filtered skills count: ${filtered.length}`);

    return filtered;
  }, [skillsFromLibrary, assignedSkillIds, selectedRace, race, mainSkills]);

  // Групуємо скіли по основним навикам
  const groupedSkills = useMemo(() => {
    const groups: Record<string, typeof availableSkills> = {};

    const ungrouped: typeof availableSkills = [];

    availableSkills.forEach((skill) => {
      // Перевіряємо чи є mainSkillId
      const skillWithMainSkill = skill as unknown as {
        mainSkillId?: string | null;
      };

      const mainSkillId = skillWithMainSkill.mainSkillId;

      if (mainSkillId) {
        // Знаходимо назву основного навику
        const mainSkill = mainSkills.find((ms) => ms.id === mainSkillId);

        if (mainSkill) {
          if (!groups[mainSkillId]) {
            groups[mainSkillId] = [];
          }

          groups[mainSkillId].push(skill);
        } else {
          ungrouped.push(skill);
        }
      } else {
        ungrouped.push(skill);
      }
    });

    return { groups, ungrouped };
  }, [availableSkills, mainSkills]);

  return {
    assignedSkillIds,
    availableSkills,
    groupedSkills,
  };
}
