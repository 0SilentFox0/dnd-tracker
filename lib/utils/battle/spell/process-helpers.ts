/**
 * Допоміжні функції для обробки заклинання (кубики, розмір кістки)
 */

/** Повертає максимальне значення кубика з diceType (d6 → 6, d8 → 8). */
export function getDiceSize(diceType: string | null | undefined): number {
  if (!diceType) return 6;

  const match = String(diceType).match(/d(\d+)/i);

  return match ? Math.max(1, parseInt(match[1], 10)) : 6;
}

/** Генерує масив випадкових кидків для заклинання (1..diceSize, length diceCount). */
export function generateSpellDamageRolls(
  diceCount: number,
  diceType: string | null | undefined,
): number[] {
  const size = getDiceSize(diceType);

  return Array.from({ length: diceCount }, () =>
    Math.floor(Math.random() * size) + 1,
  );
}
