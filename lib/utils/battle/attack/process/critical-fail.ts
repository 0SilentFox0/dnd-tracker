import { buildBattleActionForCriticalFail } from "./actions";

import { applyCriticalEffect, type CritFlavor } from "@/lib/utils/battle/attack/critical";
import { attackSourceOf } from "@/lib/utils/battle/attack/source";
import { type ActionFlow, fire, getP, put } from "@/lib/utils/battle/common/action-flow";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import type { AttackRollResult } from "@/lib/utils/battle/types/attack";
import type { ProcessAttackResult } from "@/lib/utils/battle/types/attack-process";
import type { BattleAttack } from "@/types/battle";

export interface HandleCriticalFailParams {
  flow: ActionFlow;
  attackerId: string;
  targetId: string;
  attack: BattleAttack;
  d20Roll: number;
  attackRoll: AttackRollResult;
  targetAC: number;
  currentRound: number;
  battleId: string;
  critFlavor?: CritFlavor;
}

export function handleCriticalFail(params: HandleCriticalFailParams): Omit<ProcessAttackResult, "summons"> {
  const { flow, attackerId, targetId, attack, d20Roll, attackRoll, targetAC, currentRound, battleId, critFlavor } = params;

  const criticalEffectApplied = attackRoll.criticalEffect;

  if (!criticalEffectApplied) {
    throw new Error("criticalEffect required for handleCriticalFail");
  }

  const attacker = getP(flow, attackerId);

  put(flow, applyCriticalEffect(attacker, criticalEffectApplied, currentRound));

  fire(flow, {
    type: "attack",
    phase: "after",
    actorId: attackerId,
    targetId,
    attackKind: attackKindOf(attack.type),
    ...attackSourceOf(attack),
  });

  const battleAction = buildBattleActionForCriticalFail({
    attacker,
    target: getP(flow, targetId),
    attack,
    d20Roll,
    attackRoll,
    targetAC,
    criticalEffect: criticalEffectApplied,
    messages: flow.messages,
    battleId,
    currentRound,
    critFlavor,
  });

  return {
    success: false,
    attackRoll,
    targetUpdated: getP(flow, targetId),
    attackerUpdated: getP(flow, attackerId),
    allParticipantsUpdated: flow.ps,
    criticalEffectApplied,
    battleAction,
  };
}
