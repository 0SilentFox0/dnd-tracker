import { AttackType, BATTLE_CONSTANTS } from "@/lib/constants/battle";

/**
 * Чи застосовується модифікатор «бонус до кидка атаки» до цього типу атаки.
 * `attack` / `attack_bonus` — на обидва типи; `ranged_attack` / `melee_attack` — вибірково.
 * Рядки з `disadvantage` ігноруються (не бонус до атаки).
 */
export function matchesAttackBonusModifier(
  modifierType: string,
  attackType: AttackType,
): boolean {
  const s = modifierType.toLowerCase();

  if (s.includes("disadvantage")) return false;

  if (!s.includes("attack")) return false;

  if (s.includes(AttackType.RANGED)) return attackType === AttackType.RANGED;

  if (s.includes(AttackType.MELEE)) return attackType === AttackType.MELEE;

  return true;
}

/**
 * Розраховує процентний бонус від базового значення
 * @param baseValue - базове значення
 * @param percentBonus - процентний бонус (наприклад, 25 для +25%)
 * @returns додаток до базового значення
 */
export function calculatePercentBonus(baseValue: number, percentBonus: number): number {
  if (percentBonus <= 0) return 0;

  return Math.floor(baseValue * (percentBonus / BATTLE_CONSTANTS.PERCENT_DIVISOR));
}
