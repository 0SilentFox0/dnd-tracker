/**
 * Розрахунок урону атаки та застосування до цілі (опір, tempHp, survive lethal, статус)
 */

import { applyResistance } from "../../resistance";

import { BATTLE_CONSTANTS } from "@/lib/constants/battle";
import { checkSurviveLethal } from "@/lib/utils/skills/execution";
import type { BattleParticipant } from "@/types/battle";

export interface ApplyDamageToTargetResult {
  updatedTarget: BattleParticipant;
  targetSkillUsageCounts: Record<string, number>;
}

/**
 * Застосовує фізичний + додатковий урон до цілі (tempHp, currentHp), survive lethal, статус dead/unconscious.
 */
export function applyDamageToTarget(
  target: BattleParticipant,
  totalFinalDamage: number,
  targetSkillUsageCounts: Record<string, number>,
): ApplyDamageToTargetResult {
  let updatedTarget = { ...target };

  let remainingDamage = totalFinalDamage;

  let newTempHp = updatedTarget.combatStats.tempHp;

  let newCurrentHp = updatedTarget.combatStats.currentHp;

  if (newTempHp > 0 && remainingDamage > 0) {
    const tempDamage = Math.min(newTempHp, remainingDamage);

    newTempHp -= tempDamage;
    remainingDamage -= tempDamage;
  }

  newCurrentHp = Math.max(
    BATTLE_CONSTANTS.MIN_DAMAGE,
    newCurrentHp - remainingDamage,
  );

  updatedTarget = {
    ...updatedTarget,
    combatStats: {
      ...updatedTarget.combatStats,
      tempHp: newTempHp,
      currentHp: newCurrentHp,
    },
  };

  if (updatedTarget.combatStats.currentHp <= 0) {
    const surviveResult = checkSurviveLethal(
      updatedTarget,
      targetSkillUsageCounts,
    );

    if (surviveResult.survived) {
      updatedTarget = {
        ...updatedTarget,
        combatStats: {
          ...updatedTarget.combatStats,
          currentHp: 1,
          status: "active",
        },
      };
    }
  }

  if (updatedTarget.combatStats.currentHp <= 0) {
    updatedTarget = {
      ...updatedTarget,
      combatStats: {
        ...updatedTarget.combatStats,
        status:
          updatedTarget.combatStats.currentHp < 0 ? "dead" : "unconscious",
      },
    };
  }

  return { updatedTarget, targetSkillUsageCounts };
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
): ApplyResistanceForAdditionalResult {
  let totalAdditionalDamage = 0;

  const additionalDamageBreakdown: string[] = [];

  for (const additionalDamage of additionalDamageList) {
    const additionalValue = Math.floor(additionalDamage.value * dmgMult);

    const additionalResistance = applyResistance(
      target,
      additionalValue,
      additionalDamage.type,
    );

    totalAdditionalDamage += additionalResistance.finalDamage;
    additionalDamageBreakdown.push(...additionalResistance.breakdown);
  }

  return { totalAdditionalDamage, additionalDamageBreakdown };
}
