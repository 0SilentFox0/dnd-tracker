import { getSkillMainSkillId } from "./skill-helpers";

import { isUngroupedKey, UNGROUPED_KEY } from "@/lib/constants/ungrouped";
import { groupBy } from "@/lib/utils/common/collections";
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
  const grouped = groupBy(skills, (skill) => {
    const mainSkillId = getMainSkillId(skill);

    return (mainSkillId && mainSkills.find((ms) => ms.id === mainSkillId)?.name) || UNGROUPED_KEY;
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
    
    if (isUngroupedKey(nameASafe)) return 1;

    if (isUngroupedKey(nameBSafe)) return -1;

    return nameASafe.localeCompare(nameBSafe);
  });
}

/**
 * Обчислює загальну кількість скілів у групі
 */
export function calculateTotalSkillsInGroup(skills: (Skill | GroupedSkill)[]): number {
  return skills.length;
}
