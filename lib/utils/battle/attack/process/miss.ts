/**
 * Обробка гілки промаху атаки (з опційною гарантованою шкодою)
 */

import { applyMainActionUsed } from "../../participant";
import { applyResistance } from "../../resistance";
import type { ProcessAttackResult } from "../../types/attack-process";
import type { AttackRollResult } from "..";
import { buildBattleActionForMiss } from "./actions";

import { ParticipantSide } from "@/lib/constants/battle";
import { BATTLE_CONSTANTS } from "@/lib/constants/battle";
import { executeAfterAttackTriggers } from "@/lib/utils/skills/execution";
import type { BattleParticipant } from "@/types/battle";
import type { BattleAttack } from "@/types/battle";

export interface HandleMissParams {
  attacker: BattleParticipant;
  target: BattleParticipant;
  attack: BattleAttack;
  d20Roll: number;
  attackRoll: AttackRollResult;
  targetAC: number;
  allParticipants: BattleParticipant[];
  currentRound: number;
  battleId: string;
  beforeMessages: string[];
}

export function handleMiss(params: HandleMissParams): ProcessAttackResult {
  const {
    attacker,
    target,
    attack,
    d20Roll,
    attackRoll,
    targetAC,
    allParticipants,
    currentRound,
    battleId,
    beforeMessages,
  } = params;

  let updatedTargetOnMiss = { ...target };

  const guaranteedDamage = attack.guaranteedDamage ?? 0;

  let actualGuaranteedDamage = 0;

  if (guaranteedDamage > 0) {
    const resistResult = applyResistance(
      target,
      guaranteedDamage,
      attack.damageType ?? "physical",
    );

    actualGuaranteedDamage = resistResult.finalDamage;

    let remaining = actualGuaranteedDamage;

    if (target.combatStats.tempHp > 0 && remaining > 0) {
      const tempDmg = Math.min(target.combatStats.tempHp, remaining);

      updatedTargetOnMiss = {
        ...updatedTargetOnMiss,
        combatStats: {
          ...updatedTargetOnMiss.combatStats,
          tempHp: updatedTargetOnMiss.combatStats.tempHp - tempDmg,
        },
      };
      remaining -= tempDmg;
    }

    if (remaining > 0) {
      updatedTargetOnMiss = {
        ...updatedTargetOnMiss,
        combatStats: {
          ...updatedTargetOnMiss.combatStats,
          currentHp: Math.max(
            BATTLE_CONSTANTS.MIN_DAMAGE,
            updatedTargetOnMiss.combatStats.currentHp - remaining,
          ),
        },
      };
    }
  }

  const battleAction = buildBattleActionForMiss(
    attacker,
    target,
    updatedTargetOnMiss,
    attack,
    d20Roll,
    attackRoll,
    targetAC,
    actualGuaranteedDamage,
    beforeMessages,
    [],
    battleId,
    currentRound,
  );

  let updatedAttacker = { ...attacker };

  const afterAttackResultMiss = executeAfterAttackTriggers(
    updatedAttacker,
    updatedTargetOnMiss,
    allParticipants,
    attacker.basicInfo.side === ParticipantSide.ALLY,
  );

  updatedAttacker = afterAttackResultMiss.updatedAttacker;
  battleAction.resultText = [
    battleAction.resultText,
    ...afterAttackResultMiss.messages,
  ].filter(Boolean).join(" | ");

  updatedAttacker = applyMainActionUsed(updatedAttacker);

  return {
    success: false,
    attackRoll,
    targetUpdated: updatedTargetOnMiss,
    attackerUpdated: updatedAttacker,
    reactionTriggered: false,
    battleAction,
  };
}
