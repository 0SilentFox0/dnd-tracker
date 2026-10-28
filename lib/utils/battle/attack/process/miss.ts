import { buildBattleActionForMiss } from "./actions";
import { applyDamageToTarget } from "./damage";

import { attackSourceOf } from "@/lib/utils/battle/attack/source";
import { type ActionFlow, applyFlowDamage, fire, getP, put, settleDowned } from "@/lib/utils/battle/common/action-flow";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import { applyBalanceDamageMultiplier } from "@/lib/utils/battle/damage/balance-multiplier";
import { applyResistance } from "@/lib/utils/battle/resistance";
import type { AttackRollResult } from "@/lib/utils/battle/types/attack";
import type { ProcessAttackResult } from "@/lib/utils/battle/types/attack-process";
import type { BattleAttack } from "@/types/battle";

export interface HandleMissParams {
  flow: ActionFlow;
  attackerId: string;
  targetId: string;
  attack: BattleAttack;
  d20Roll: number;
  attackRoll: AttackRollResult;
  targetAC: number;
  currentRound: number;
  battleId: string;
}

export function handleMiss(params: HandleMissParams): Omit<ProcessAttackResult, "summons"> {
  const { flow, attackerId, targetId, attack, d20Roll, attackRoll, targetAC, currentRound, battleId } = params;

  const target = getP(flow, targetId);

  const guaranteedDamage = applyBalanceDamageMultiplier(getP(flow, attackerId), attack.guaranteedDamage ?? 0).damage;

  let actualGuaranteedDamage = 0;

  if (guaranteedDamage > 0) {
    actualGuaranteedDamage = applyResistance(target, guaranteedDamage, attack.damageType ?? "physical", { participants: flow.ps, attackKind: attackKindOf(attack.type) }).finalDamage;

    put(flow, applyDamageToTarget(target, actualGuaranteedDamage).updatedTarget);
    applyFlowDamage(flow, target, actualGuaranteedDamage);
    settleDowned(flow, targetId, attackerId);
  }

  fire(flow, {
    type: "attack",
    phase: "after",
    actorId: attackerId,
    targetId,
    attackKind: attackKindOf(attack.type),
    ...attackSourceOf(attack),
  });

  const battleAction = buildBattleActionForMiss({
    attacker: getP(flow, attackerId),
    target,
    targetAfter: getP(flow, targetId),
    attack,
    d20Roll,
    attackRoll,
    targetAC,
    guaranteedDamage: actualGuaranteedDamage,
    messages: flow.messages,
    battleId,
    currentRound,
  });

  return {
    success: false,
    attackRoll,
    targetUpdated: getP(flow, targetId),
    attackerUpdated: getP(flow, attackerId),
    allParticipantsUpdated: flow.ps,
    battleAction,
  };
}
