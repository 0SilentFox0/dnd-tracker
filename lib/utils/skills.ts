import type { Skill } from "@/lib/types/skills";

/**
 * Групує скіли по групах
 */
export function groupSkillsByGroup(skills: Skill[]): Map<string, Skill[]> {
  const grouped = new Map<string, Skill[]>();

  skills.forEach((skill) => {
    // Перевіряємо чи є spellGroup об'єкт або spellGroupId
    let groupName = "Без групи";
    if (skill.spellGroup?.name) {
      groupName = skill.spellGroup.name;
    } else if (skill.spellGroupId) {
      // Якщо є spellGroupId але немає об'єкта spellGroup, залишаємо як "Без групи"
      // Це може статися якщо дані не завантажені повністю
      groupName = "Без групи";
    }
    
    if (!grouped.has(groupName)) {
      grouped.set(groupName, []);
    }
    grouped.get(groupName)!.push(skill);
  });

  // Сортуємо скіли всередині кожної групи по назві
  grouped.forEach((groupSkills) => {
    groupSkills.sort((a, b) => a.name.localeCompare(b.name));
  });

  return grouped;
}

/**
 * Конвертує Map з групами в масив для рендеру
 */
export function convertGroupedSkillsToArray(
  groupedSkillsMap: Map<string, Skill[]>
): [string, Skill[]][] {
  return Array.from(groupedSkillsMap.entries()).sort(([nameA], [nameB]) => {
    // "Без групи" завжди останній
    if (nameA === "Без групи") return 1;
    if (nameB === "Без групи") return -1;
    return nameA.localeCompare(nameB);
  });
}

/**
 * Обчислює загальну кількість скілів у групі
 */
export function calculateTotalSkillsInGroup(skills: Skill[]): number {
  return skills.length;
}
