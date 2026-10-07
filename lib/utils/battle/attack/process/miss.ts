import { applyBalanceDamageMultiplier } from "../../damage/balance-multiplier";
import { applyMainActionUsed } from "../../participant";
import { applyResistance } from "../../resistance";
import type { ProcessAttackResult } from "../../types/attack-process";
import type { AttackRollResult } from "..";
import { type AttackFlow, fire, getP, put, settleDowned } from "./ability-flow";
import { buildBattleActionForMiss } from "./actions";
import { applyDamageToTarget } from "./damage";

import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import type { BattleAttack } from "@/types/battle";

export interface HandleMissParams {
  flow: AttackFlow;
  attackerId: string;
  targetId: string;
  attack: BattleAttack;
  d20Roll: number;
  attackRoll: AttackRollResult;
  targetAC: number;
  currentRound: number;
  battleId: string;
}

export function handleMiss(params: HandleMissParams): ProcessAttackResult {
  const { flow, attackerId, targetId, attack, d20Roll, attackRoll, targetAC, currentRound, battleId } = params;

  const target = getP(flow, targetId);

  const guaranteedDamage = applyBalanceDamageMultiplier(getP(flow, attackerId), attack.guaranteedDamage ?? 0).damage;

  let actualGuaranteedDamage = 0;

  if (guaranteedDamage > 0) {
    actualGuaranteedDamage = applyResistance(target, guaranteedDamage, attack.damageType ?? "physical", { participants: flow.ps }).finalDamage;

    put(flow, applyDamageToTarget(target, actualGuaranteedDamage).updatedTarget);
    settleDowned(flow, targetId, attackerId);
  }

  fire(flow, {
    type: "attack",
    phase: "after",
    actorId: attackerId,
    targetId,
    attackKind: attackKindOf(attack.type),
  });

  put(flow, applyMainActionUsed(getP(flow, attackerId)));

  const battleAction = buildBattleActionForMiss(
    getP(flow, attackerId),
    target,
    getP(flow, targetId),
    attack,
    d20Roll,
    attackRoll,
    targetAC,
    actualGuaranteedDamage,
    flow.messages,
    [],
    battleId,
    currentRound,
  );

  return {
    success: false,
    attackRoll,
    targetUpdated: getP(flow, targetId),
    attackerUpdated: getP(flow, attackerId),
    allParticipantsUpdated: flow.ps,
    battleAction,
  };
}
