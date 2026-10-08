import { applyResistance } from "../../resistance";

import { BATTLE_CONSTANTS, CombatStatus } from "@/lib/constants/battle";
import type { AttackKind } from "@/lib/utils/abilities/schema";
import type { BattleParticipant } from "@/types/battle";

export interface ApplyDamageToTargetResult {
  updatedTarget: BattleParticipant;
}

/** Фізичний + додатковий урон: спершу tempHp, далі HP і статус. Виживання вирішують уміння (lethalDamage). */
export function applyDamageToTarget(target: BattleParticipant, totalFinalDamage: number): ApplyDamageToTargetResult {
  const fromTemp = Math.min(target.combatStats.tempHp, Math.max(0, totalFinalDamage));

  const currentHp = Math.max(BATTLE_CONSTANTS.MIN_DAMAGE, target.combatStats.currentHp - (totalFinalDamage - fromTemp));

  return {
    updatedTarget: {
      ...target,
      combatStats: {
        ...target.combatStats,
        tempHp: target.combatStats.tempHp - fromTemp,
        currentHp,
        status: currentHp <= 0 ? (currentHp < 0 ? CombatStatus.DEAD : CombatStatus.UNCONSCIOUS) : target.combatStats.status,
      },
    },
  };
}

export interface ApplyResistanceForAdditionalResult {
  totalAdditionalDamage: number;
  additionalDamageBreakdown: string[];
}

/**
 * Застосовує опір для додаткових типів урону (fire, poison тощо).
 */
export function applyResistanceForAdditional(
  target: BattleParticipant,
  additionalDamageList: Array<{ type: string; value: number }>,
  dmgMult: number,
  participants: BattleParticipant[] = [target],
  attackKind?: AttackKind,
): ApplyResistanceForAdditionalResult {
  let totalAdditionalDamage = 0;

  const additionalDamageBreakdown: string[] = [];

  for (const additionalDamage of additionalDamageList) {
    const additionalValue = Math.floor(additionalDamage.value * dmgMult);

    const additionalResistance = applyResistance(
      target,
      additionalValue,
      additionalDamage.type,
      { participants, attackKind },
    );

    totalAdditionalDamage += additionalResistance.finalDamage;
    additionalDamageBreakdown.push(...additionalResistance.breakdown);
  }

  return { totalAdditionalDamage, additionalDamageBreakdown };
}
