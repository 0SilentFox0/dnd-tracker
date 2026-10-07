import type { BattleParticipant } from "@/types/battle";

export function balanceDamageMultiplier(p: BattleParticipant): number {
  const x = p.battleData.damageMultiplier;

  return typeof x === "number" && Number.isFinite(x) && x > 0 ? x : 1;
}

/** Масштаб шкоди ворога для рівного бою: після кубиків і модифікаторів, до опору. */
export function applyBalanceDamageMultiplier(attacker: BattleParticipant, damage: number): { damage: number; multiplier: number } {
  const multiplier = balanceDamageMultiplier(attacker);

  return multiplier === 1 ? { damage, multiplier } : { damage: Math.round(damage * multiplier), multiplier };
}

export function scaleAdditionalDamage(attacker: BattleParticipant, list: Array<{ type: string; value: number }>): Array<{ type: string; value: number }> {
  const multiplier = balanceDamageMultiplier(attacker);

  return multiplier === 1 ? list : list.map((d) => ({ ...d, value: Math.round(d.value * multiplier) }));
}
