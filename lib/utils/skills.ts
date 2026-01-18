import type { Skill } from "@/lib/types/skills";
import type { MainSkill } from "@/lib/types/main-skills";

/**
 * Групує скіли по групах (застаріла функція, використовується для сумісності)
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
 * Групує скіли по основним навикам
 */
export function groupSkillsByMainSkill(
  skills: Skill[],
  mainSkills: MainSkill[]
): Map<string, Skill[]> {
  const grouped = new Map<string, Skill[]>();

  skills.forEach((skill) => {
    // Перевіряємо чи є mainSkillId
    let groupName = "Без основного навику";
    if (skill.mainSkillId) {
      const mainSkill = mainSkills.find((ms) => ms.id === skill.mainSkillId);
      if (mainSkill) {
        groupName = mainSkill.name;
      }
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
    // "Без групи" або "Без основного навику" завжди останній
    if (nameA === "Без групи" || nameA === "Без основного навику") return 1;
    if (nameB === "Без групи" || nameB === "Без основного навику") return -1;
    return nameA.localeCompare(nameB);
  });
}

/**
 * Обчислює загальну кількість скілів у групі
 */
export function calculateTotalSkillsInGroup(skills: Skill[]): number {
  return skills.length;
}
