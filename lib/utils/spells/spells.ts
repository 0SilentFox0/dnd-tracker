import type { Spell } from "@/types/spells";

/**
 * Форматує рівень заклинання для відображення
 */
export function formatSpellLevel(level: number): string {
  return level === 0 ? "Cantrip" : `Рівень ${level}`;
}

/**
 * Групує заклинання по групах
 */
export function groupSpellsByGroup(spells: Spell[]): Map<string, Spell[]> {
  const grouped = new Map<string, Spell[]>();

  spells.forEach((spell) => {
    const groupName = spell.spellGroup?.name || "Без групи";

    if (!grouped.has(groupName)) {
      grouped.set(groupName, []);
    }

    const group = grouped.get(groupName);

    if (group) {
      group.push(spell);
    }
  });

  // Сортуємо заклинання всередині кожної групи по рівню та назві
  grouped.forEach((groupSpells) => {
    groupSpells.sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;

      return a.name.localeCompare(b.name);
    });
  });

  return grouped;
}

/**
 * Групує заклинання спочатку по групах, потім по рівнях
 */
export function groupSpellsByGroupAndLevel(
  spells: Spell[],
): Map<string, Map<string, Spell[]>> {
  const groupedSpellsMap = new Map<string, Map<string, Spell[]>>();

  spells.forEach((spell) => {
    const groupName = spell.spellGroup?.name || "Без групи";

    const levelKey = formatSpellLevel(spell.level);

    if (!groupedSpellsMap.has(groupName)) {
      groupedSpellsMap.set(groupName, new Map<string, Spell[]>());
    }

    const levelMap = groupedSpellsMap.get(groupName);

    if (!levelMap) {
      return;
    }

    if (!levelMap.has(levelKey)) {
      levelMap.set(levelKey, []);
    }

    const levelArray = levelMap.get(levelKey);

    if (levelArray) {
      levelArray.push(spell);
    }
  });

  // Сортуємо заклинання всередині кожного рівня
  groupedSpellsMap.forEach((levelMap) => {
    levelMap.forEach((levelSpells) => {
      levelSpells.sort((a, b) => a.name.localeCompare(b.name));
    });
  });

  return groupedSpellsMap;
}

/**
 * Сортує рівні заклинань для відображення
 */
export function sortSpellLevels(
  levels: [string, Spell[]][],
): [string, Spell[]][] {
  return [...levels].sort(([levelA], [levelB]) => {
    // Cantrip завжди перший
    if (levelA === "Cantrip") return -1;

    if (levelB === "Cantrip") return 1;

    // Інші рівні сортуються числово
    const numA = parseInt(levelA.replace("Рівень ", "")) || 0;

    const numB = parseInt(levelB.replace("Рівень ", "")) || 0;

    return numA - numB;
  });
}

/**
 * Конвертує Map з групами та рівнями в масив для рендеру
 */
export function convertGroupedSpellsToArray(
  groupedSpellsMap: Map<string, Map<string, Spell[]>>,
): [string, [string, Spell[]][]][] {
  return Array.from(groupedSpellsMap.entries()).map(([groupName, levelMap]) => {
    const sortedLevels = sortSpellLevels(Array.from(levelMap.entries()));

    return [groupName, sortedLevels] as [string, [string, Spell[]][]];
  });
}

/**
 * Фільтрує заклинання за вибраними ID
 */
export function filterSelectedSpells(
  spells: Spell[],
  selectedSpellIds: string[],
): Spell[] {
  return spells.filter((spell) => selectedSpellIds.includes(spell.id));
}

/**
 * Обчислює загальну кількість заклинань у групі
 */
export function calculateTotalSpellsInGroup(
  levels: [string, Spell[]][],
): number {
  return levels.reduce((sum, [, spells]) => sum + spells.length, 0);
}
