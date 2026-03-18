/**
 * Утиліти для кубиків (dice notation): середнє, парсинг, об'єднання формул
 */

/** Один блок кубиків: count × d(sides). */
export interface DiceGroup {
  count: number;
  sides: number;
}

/** Середнє одного блоку: 1d6 = 3.5, 2d6+3 = 10 */
function getDiceAverageSingle(notation: string): number {
  const match = notation.trim().match(/^(\d+)d(\d+)([+-]\d+)?$/);

  if (!match) return 0;

  const count = parseInt(match[1], 10);

  const sides = parseInt(match[2], 10);

  const mod = match[3] ? parseInt(match[3], 10) : 0;

  const avgDice = (count * (sides + 1)) / 2;

  return avgDice + mod;
}

/**
 * Середнє значення кубиків: 1d6 = 3.5, 2d6+3 = 10, 2d8+1d6 = 13.
 */
export function getDiceAverage(diceNotation: string): number {
  if (!diceNotation || !diceNotation.trim()) return 0;

  const parts = diceNotation.split(/\s*\+\s*/);

  return parts.reduce((sum, part) => {
    const p = part.trim();

    const single = getDiceAverageSingle(p);

    if (single !== 0) return sum + single;

    const modMatch = p.match(/^([+-]?\d+)$/);

    return sum + (modMatch ? parseInt(modMatch[1], 10) : 0);
  }, 0);
}

/**
 * Парсить нотацію кубиків у групи. "2d6+3d8" → [{ count: 2, sides: 6 }, { count: 3, sides: 8 }].
 */
export function parseDiceNotationToGroups(diceNotation: string): DiceGroup[] {
  if (!diceNotation || !diceNotation.trim()) return [];

  const bySides: Record<number, number> = {};

  const parts = diceNotation.split(/\s*\+\s*/);

  for (const part of parts) {
    const p = part.trim();

    const match = p.match(/^(\d+)d(\d+)([+-]\d+)?$/);

    if (match) {
      const count = parseInt(match[1], 10);

      const sides = parseInt(match[2], 10);

      bySides[sides] = (bySides[sides] ?? 0) + count;
    }
  }

  return Object.entries(bySides)
    .map(([sides, count]) => ({ count, sides: parseInt(sides, 10) }))
    .sort((a, b) => a.sides - b.sides);
}

/** Масив сторін кубиків для формули (для UI введення кидків). */
export function getDiceSlots(formula: string): number[] {
  const groups = parseDiceNotationToGroups(formula);

  const slots: number[] = [];

  for (const g of groups) {
    const sides = Number(g.sides);

    if (!Number.isFinite(sides) || sides < 1) continue;

    for (let i = 0; i < g.count; i++) slots.push(sides);
  }

  return slots.length > 0 ? slots : [6];
}

/** Загальна кількість кубиків у нотації */
export function getTotalDiceCount(diceNotation: string): number {
  return parseDiceNotationToGroups(diceNotation).reduce(
    (sum, g) => sum + g.count,
    0,
  );
}

/** Об'єднує дві формули кубиків. "1d6" + "3d8+1d6" → "2d6+3d8". */
export function mergeDiceFormulas(
  weaponNotation: string,
  heroNotation: string,
): string {
  const weapon = weaponNotation?.trim() || "";

  const hero = heroNotation?.trim() || "";

  if (!weapon && !hero) return "";

  const groups = [
    ...parseDiceNotationToGroups(weapon),
    ...parseDiceNotationToGroups(hero),
  ];

  const bySides: Record<number, number> = {};

  for (const g of groups) {
    bySides[g.sides] = (bySides[g.sides] ?? 0) + g.count;
  }

  return Object.entries(bySides)
    .sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10))
    .map(([sides, count]) => `${count}d${sides}`)
    .join("+");
}
