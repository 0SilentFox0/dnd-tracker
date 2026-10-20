import { buildBattleActionForCriticalFail } from "./actions";

import { applyCriticalEffect } from "@/lib/utils/battle/attack/critical";
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
  critFlavorText?: string;
}

export function handleCriticalFail(params: HandleCriticalFailParams): Omit<ProcessAttackResult, "summons"> {
  const { flow, attackerId, targetId, attack, d20Roll, attackRoll, targetAC, currentRound, battleId, critFlavorText } = params;

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
    critFlavorText,
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
