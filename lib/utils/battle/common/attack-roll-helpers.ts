/**
 * Утиліти для визначення результату кидка атаки (hit/miss/crit).
 * Використовуються в UI (PlayerTurnView) та при потребі на бекенді.
 */

export interface AttackRollData {
  attackRoll: number;
  advantageRoll?: number;
  disadvantageRoll?: number;
}

export interface ResolveAttackRollResult {
  hit: boolean;
  crit: boolean;
  critFail: boolean;
}

/**
 * Обчислює ефективний d20 з урахуванням advantage/disadvantage.
 */
export function getEffectiveD20(data: AttackRollData | undefined): number {
  if (!data) return 0;

  if (data.advantageRoll != null) {
    return Math.max(data.attackRoll, data.advantageRoll);
  }

  if (data.disadvantageRoll != null) {
    return Math.min(data.attackRoll, data.disadvantageRoll);
  }

  return data.attackRoll;
}

/**
 * Визначає результат атаки: hit, crit, critFail.
 * @param data — кидки гравця
 * @param targetAC — КБ цілі
 * @param totalAttackBonus — повний бонус атаки (attackBonus + statModifier + proficiencyBonus)
 */
export function resolveAttackRoll(
  data: AttackRollData,
  targetAC: number,
  totalAttackBonus: number,
  crit: { critOn: number; fumbleOn: number } = { critOn: 20, fumbleOn: 1 },
): ResolveAttackRollResult {
  const d20 = getEffectiveD20(data);

  const critFail = crit.fumbleOn > 0 && d20 <= crit.fumbleOn;

  const isCrit = !critFail && d20 >= crit.critOn;

  const totalRoll = d20 + totalAttackBonus;

  const hit = !critFail && (isCrit || totalRoll >= targetAC);

  return { hit, crit: isCrit, critFail };
}
