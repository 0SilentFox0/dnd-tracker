/**
 * Спільна логіка для розрахунку модифікаторів урону
 */

export type AttackType = "melee" | "ranged";

/**
 * Перевіряє чи відповідає тип ефекту типу атаки
 * @param effectType - тип ефекту (наприклад, "melee_damage_percent")
 * @param attackType - тип атаки ("melee" | "ranged")
 * @returns true якщо ефект застосовується до цього типу атаки
 */
export function matchesAttackType(effectType: string, attackType: AttackType): boolean {
  const typeLower = effectType.toLowerCase();

  if (attackType === "melee") {
    return (
      (typeLower.includes("melee") && typeLower.includes("damage")) ||
      (typeLower.includes("physical") && typeLower.includes("damage"))
    );
  } else {
    return (
      (typeLower.includes("ranged") && typeLower.includes("damage")) ||
      (typeLower.includes("physical") && typeLower.includes("damage"))
    );
  }
}

/**
 * Розраховує процентний бонус від базового значення
 * @param baseValue - базове значення
 * @param percentBonus - процентний бонус (наприклад, 25 для +25%)
 * @returns додаток до базового значення
 */
export function calculatePercentBonus(baseValue: number, percentBonus: number): number {
  if (percentBonus <= 0) return 0;

  return Math.floor(baseValue * (percentBonus / 100));
}

/**
 * Створює breakdown рядок для процентного бонусу
 * @param source - джерело бонусу (наприклад, "Бонуси зі скілів")
 * @param percent - процентний бонус
 * @returns breakdown рядок
 */
export function formatPercentBonusBreakdown(source: string, percent: number): string {
  if (percent <= 0) return "";

  return `${source}: +${percent}%`;
}

/**
 * Створює breakdown рядок для flat бонусу
 * @param source - джерело бонусу
 * @param flat - flat бонус
 * @returns breakdown рядок або порожній рядок якщо бонус = 0
 */
export function formatFlatBonusBreakdown(source: string, flat: number): string {
  if (flat <= 0) return "";

  return `${source}: +${flat}`;
}
