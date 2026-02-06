/**
 * Спільна логіка для розрахунку модифікаторів урону
 */

import { AttackType } from "@/lib/constants/battle";

/**
 * Перевіряє чи відповідає тип ефекту типу атаки.
 * Підтримує два формати:
 *  - новий: stat name ("melee_damage", "ranged_damage", "physical_damage")
 *  - легасі: повне ім'я ("melee_damage_percent")
 * @param effectStat - stat ефекту (або legacy type)
 * @param attackType - тип атаки (AttackType enum)
 * @returns true якщо ефект застосовується до цього типу атаки
 */
export function matchesAttackType(effectStat: string, attackType: AttackType): boolean {
  const s = effectStat.toLowerCase();

  if (attackType === AttackType.MELEE) {
    return (
      s === "melee_damage" ||
      s === "physical_damage" ||
      (s.includes("melee") && s.includes("damage")) ||
      (s.includes("physical") && s.includes("damage"))
    );
  } else {
    return (
      s === "ranged_damage" ||
      s === "physical_damage" ||
      (s.includes("ranged") && s.includes("damage")) ||
      (s.includes("physical") && s.includes("damage"))
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
