import { applyMainActionUsed } from "../../participant";
import type { ProcessAttackResult } from "../../types/attack-process";
import type { AttackRollResult } from "..";
import { applyCriticalEffect } from "..";
import { type AttackFlow, fire, getP, put } from "./ability-flow";
import { buildBattleActionForCriticalFail } from "./actions";

import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import type { BattleAttack } from "@/types/battle";

export interface HandleCriticalFailParams {
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

export function handleCriticalFail(params: HandleCriticalFailParams): ProcessAttackResult {
  const { flow, attackerId, targetId, attack, d20Roll, attackRoll, targetAC, currentRound, battleId } = params;

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

  put(flow, applyMainActionUsed(getP(flow, attackerId)));

  const battleAction = buildBattleActionForCriticalFail(
    attacker,
    getP(flow, targetId),
    attack,
    d20Roll,
    attackRoll,
    targetAC,
    criticalEffectApplied,
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
    criticalEffectApplied,
    battleAction,
  };
}
