import { getSkillMainSkillId } from "./skill-helpers";

import type { MainSkill } from "@/types/main-skills";
import type { GroupedSkill, Skill } from "@/types/skills";

/**
 * Отримує mainSkillId зі скіла (підтримує обидві структури)
 * @deprecated Використовуйте getSkillMainSkillId з skill-helpers
 */
function getMainSkillId(skill: Skill | GroupedSkill): string | null | undefined {
  return getSkillMainSkillId(skill);
}

/**
 * Групує скіли по основним навикам
 * Підтримує обидві структури: Skill (плоска) та GroupedSkill (згрупована)
 */
export function groupSkillsByMainSkill(
  skills: (Skill | GroupedSkill)[],
  mainSkills: MainSkill[]
): Map<string, (Skill | GroupedSkill)[]> {
  const grouped = new Map<string, (Skill | GroupedSkill)[]>();

  skills.forEach((skill) => {
    let groupName = "Без основного навику";

    const mainSkillId = getMainSkillId(skill);

    if (mainSkillId) {
      const mainSkill = mainSkills.find((ms) => ms.id === mainSkillId);

      if (mainSkill) {
        groupName = mainSkill.name;
      }
    }
    
    if (!grouped.has(groupName)) {
      grouped.set(groupName, []);
    }

    const group = grouped.get(groupName);

    if (group) {
      group.push(skill);
    }
  });

  grouped.forEach((groupSkills) => {
    groupSkills.sort((a, b) => {
      const nameA = ('basicInfo' in a ? a.basicInfo?.name : a.name) || "";

      const nameB = ('basicInfo' in b ? b.basicInfo?.name : b.name) || "";

      return nameA.localeCompare(nameB);
    });
  });

  return grouped;
}

/**
 * Конвертує Map з групами в масив для рендеру
 */
export function convertGroupedSkillsToArray(
  groupedSkillsMap: Map<string, (Skill | GroupedSkill)[]>
): [string, (Skill | GroupedSkill)[]][] {
  return Array.from(groupedSkillsMap.entries()).sort(([nameA], [nameB]) => {
    const nameASafe = nameA || "";

    const nameBSafe = nameB || "";
    
    // "Без групи" або "Без основного навику" завжди останній
    if (nameASafe === "Без групи" || nameASafe === "Без основного навику") return 1;

    if (nameBSafe === "Без групи" || nameBSafe === "Без основного навику") return -1;

    return nameASafe.localeCompare(nameBSafe);
  });
}

/**
 * Обчислює загальну кількість скілів у групі
 */
export function calculateTotalSkillsInGroup(skills: (Skill | GroupedSkill)[]): number {
  return skills.length;
}
