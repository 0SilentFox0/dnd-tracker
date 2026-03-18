/**
 * Обробка гілки критичного промаху атаки
 */

import { applyMainActionUsed } from "../../participant";
import type { ProcessAttackResult } from "../../types/attack-process";
import type { AttackRollResult } from "..";
import { applyCriticalEffect } from "..";
import { buildBattleActionForCriticalFail } from "./actions";

import { ParticipantSide } from "@/lib/constants/battle";
import { executeAfterAttackTriggers } from "@/lib/utils/skills/execution";
import type { BattleParticipant } from "@/types/battle";
import type { BattleAttack } from "@/types/battle";

export interface HandleCriticalFailParams {
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

export function handleCriticalFail(params: HandleCriticalFailParams): ProcessAttackResult {
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

  const criticalEffectApplied = attackRoll.criticalEffect;

  if (!criticalEffectApplied) {
    throw new Error("criticalEffect required for handleCriticalFail");
  }

  let updatedAttacker = applyCriticalEffect(
    attacker,
    criticalEffectApplied,
    currentRound,
  );

  const battleAction = buildBattleActionForCriticalFail(
    attacker,
    target,
    attack,
    d20Roll,
    attackRoll,
    targetAC,
    criticalEffectApplied,
    beforeMessages,
    [],
    battleId,
    currentRound,
  );

  const afterAttackResultFail = executeAfterAttackTriggers(
    updatedAttacker,
    target,
    allParticipants,
    attacker.basicInfo.side === ParticipantSide.ALLY,
  );

  updatedAttacker = afterAttackResultFail.updatedAttacker;
  battleAction.resultText = [
    battleAction.resultText,
    ...afterAttackResultFail.messages,
  ].filter(Boolean).join(" | ");

  updatedAttacker = applyMainActionUsed(updatedAttacker);

  return {
    success: false,
    attackRoll,
    targetUpdated: target,
    attackerUpdated: updatedAttacker,
    criticalEffectApplied,
    reactionTriggered: false,
    battleAction,
  };
}
