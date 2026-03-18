/**
 * Розрахунок Attack Roll (d20 + бонус, критики, ефект)
 */

import type { AttackRollResult } from "../types/attack";
import { calculateAttackBonus, hasAdvantage, hasDisadvantage } from "./bonus";

import type { CriticalEffect } from "@/lib/constants/critical-effects";
import { getRandomCriticalEffect } from "@/lib/constants/critical-effects";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

export function calculateAttackRoll(
  attacker: BattleParticipant,
  attack: BattleAttack,
  d20Roll: number,
  advantageRoll?: number,
  disadvantageRoll?: number,
): AttackRollResult {
  const attackBonus = calculateAttackBonus(attacker, attack);

  const hasAdv = hasAdvantage(attacker, attack);

  const hasDisadv = hasDisadvantage(attacker, attack);

  let finalRoll = d20Roll;

  let advantageUsed = false;

  if (hasAdv && hasDisadv) {
    // нормальний кидок
  } else if (hasAdv) {
    if (advantageRoll !== undefined) {
      finalRoll = Math.max(d20Roll, advantageRoll);
      advantageUsed = true;
    }
  } else if (hasDisadv) {
    if (disadvantageRoll !== undefined) {
      finalRoll = Math.min(d20Roll, disadvantageRoll);
    }
  }

  const totalAttackValue = finalRoll + attackBonus;

  const isCritical = finalRoll === 20;

  const isCriticalFail = finalRoll === 1;

  const isHit = !isCriticalFail;

  let criticalEffect: CriticalEffect | undefined;

  if (isCritical) {
    criticalEffect = getRandomCriticalEffect("success");
  } else if (isCriticalFail) {
    criticalEffect = getRandomCriticalEffect("fail");
  }

  return {
    isHit,
    isCritical,
    isCriticalFail,
    totalAttackValue,
    attackBonus,
    criticalEffect,
    advantageUsed,
  };
}
