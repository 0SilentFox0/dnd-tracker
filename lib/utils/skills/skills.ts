import { isUngroupedKey, UNGROUPED_KEY } from "@/lib/constants/ungrouped";
import { groupBy } from "@/lib/utils/common/collections";
import type { MainSkill } from "@/types/main-skills";
import type { Skill } from "@/types/skills";

/** Groups by main skill name (unknown/absent → UNGROUPED_KEY), each group sorted by skill name. */
export function groupSkillsByMainSkill(skills: Skill[], mainSkills: MainSkill[]): Map<string, Skill[]> {
  const grouped = groupBy(skills, (skill) => (skill.mainSkillId && mainSkills.find((ms) => ms.id === skill.mainSkillId)?.name) || UNGROUPED_KEY);

  grouped.forEach((groupSkills) => {
    groupSkills.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  });

  return grouped;
}

/** Groups sorted by name, the ungrouped one last. */
export function convertGroupedSkillsToArray(groupedSkillsMap: Map<string, Skill[]>): [string, Skill[]][] {
  return Array.from(groupedSkillsMap.entries()).sort(([nameA], [nameB]) => {
    const nameASafe = nameA || "";

    const nameBSafe = nameB || "";

    if (isUngroupedKey(nameASafe)) return 1;

    if (isUngroupedKey(nameBSafe)) return -1;

    return nameASafe.localeCompare(nameBSafe);
  });
}
