/**
 * Утиліти для розрахунків заклинань
 */

/**
 * Розраховує середню шкоду або лікування заклинання
 * Середнє значення для dN = (N + 1) / 2
 */
export function calculateAverageSpellEffect(
  diceCount: number | null | undefined,
  diceType: string | null | undefined
): number {
  if (!diceCount || !diceType) return 0;

  // Витягуємо число з типу кубика (d4 -> 4, d6 -> 6, etc.)
  const diceSize = parseInt(diceType.replace("d", ""), 10);
  if (isNaN(diceSize)) return 0;

  // Середнє значення для одного кубика
  const averagePerDice = (diceSize + 1) / 2;

  // Загальна середня шкода/лікування
  return diceCount * averagePerDice;
}

/**
 * Форматує середню шкоду/лікування для відображення
 */
export function formatSpellAverage(
  damageType: string,
  averageEffect: number
): string {
  if (averageEffect === 0) return "";

  if (damageType === "damage") {
    return `~${Math.round(averageEffect)} шкоди`;
  } else if (damageType === "heal") {
    return `~${Math.round(averageEffect)} лікування`;
  } else if (damageType === "all") {
    return `~${Math.round(averageEffect)} ефекту`;
  }

  return "";
}
