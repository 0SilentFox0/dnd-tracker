/**
 * Повна обробка атаки з усіма модифікаторами, вміннями та ефектами
 */

import {
  applyMainActionUsed,
  getEffectiveArmorClass,
} from "../../participant";
import type {
  ProcessAttackParams,
  ProcessAttackResult,
} from "../../types/attack-process";
import { calculateAttackRoll } from "..";
import { appendHpChanges, type AttackFlow, fire, getP, put } from "./ability-flow";
import { buildAbortedAttackAction, buildBattleActionForHit } from "./actions";
import { handleCriticalFail } from "./critical-fail";
import { resolveHit } from "./hit";
import { handleMiss } from "./miss";

import { AttackType } from "@/lib/constants/battle";
import { findFlags } from "@/lib/utils/abilities/engine/collect-modifiers";
import { isUp, withSelf } from "@/lib/utils/abilities/engine/participants";

export type { ProcessAttackParams, ProcessAttackResult };

export function processAttack(params: ProcessAttackParams): ProcessAttackResult {
  const {
    attacker,
    target,
    attack,
    d20Roll,
    advantageRoll,
    disadvantageRoll,
    damageRolls,
    allParticipants,
    currentRound,
    battleId,
    damageMultiplier,
  } = params;

  const attackerId = attacker.basicInfo.id;

  const targetId = target.basicInfo.id;

  const attackKind = attack.type === AttackType.RANGED ? "ranged" : "melee";

  const before = withSelf(withSelf(allParticipants, target), attacker);

  const flow: AttackFlow = { ps: before, messages: [], ctx: { round: currentRound, rng: params.rng ?? Math.random } };

  const { actionModifiers } = fire(flow, { type: "attack", phase: "before", actorId: attackerId, targetId, attackKind });

  if (!isUp(getP(flow, targetId))) {
    put(flow, applyMainActionUsed(getP(flow, attackerId)));

    const battleAction = buildAbortedAttackAction(getP(flow, attackerId), target, attack, flow.messages, battleId, currentRound);

    appendHpChanges(battleAction, before, flow.ps);

    return {
      success: false,
      attackRoll: calculateAttackRoll(getP(flow, attackerId), attack, d20Roll, advantageRoll, disadvantageRoll, { participants: flow.ps }),
      targetUpdated: getP(flow, targetId),
      attackerUpdated: getP(flow, attackerId),
      allParticipantsUpdated: flow.ps,
      battleAction,
    };
  }

  const attackRoll = calculateAttackRoll(getP(flow, attackerId), attack, d20Roll, advantageRoll, disadvantageRoll, {
    participants: flow.ps,
    extra: actionModifiers[attackerId],
    targetId,
    targetExtra: actionModifiers[targetId],
  });

  const targetAC = getEffectiveArmorClass(getP(flow, targetId), flow.ps, actionModifiers[targetId]);

  const guaranteedHit = findFlags(flow.ps, attackerId, "guaranteedHit", actionModifiers[attackerId]).length > 0;

  const isHit = !attackRoll.isCriticalFail && (attackRoll.isCritical || guaranteedHit || attackRoll.totalAttackValue >= targetAC);

  const branch = { flow, attackerId, targetId, attack, d20Roll, attackRoll, targetAC, currentRound, battleId };

  if (attackRoll.isCriticalFail && attackRoll.criticalEffect) {
    const r = handleCriticalFail(branch);

    appendHpChanges(r.battleAction, before, flow.ps);

    return r;
  }

  if (!isHit) {
    const r = handleMiss(branch);

    appendHpChanges(r.battleAction, before, flow.ps);

    return r;
  }

  const { hitDamage, vampirismHeal } = resolveHit({
    flow,
    attackerId,
    targetId,
    attack,
    damageRolls,
    attackRoll,
    damageMultiplier,
    currentRound,
    actionModifiers: actionModifiers[attackerId],
  });

  const {
    damageCalculation,
    physicalDamage,
    totalFinalDamage,
    resistanceResult,
    additionalDamageBreakdown,
    criticalEffectApplied,
    damageSteps,
    oldHp,
  } = hitDamage;

  fire(flow, { type: "attack", phase: "after", actorId: attackerId, targetId, attackKind });

  put(flow, applyMainActionUsed(getP(flow, attackerId)));

  const battleAction = buildBattleActionForHit({
    attacker: getP(flow, attackerId),
    target: getP(flow, targetId),
    attack,
    d20Roll,
    damageRolls,
    attackRoll,
    targetAC,
    damageCalculation,
    physicalDamage,
    totalFinalDamage,
    resistanceResult,
    criticalEffectApplied,
    damageSteps,
    beforeMessages: [],
    afterMessages: flow.messages,
    vampirismHeal,
    oldHp,
    battleId,
    currentRound,
  });

  appendHpChanges(battleAction, before, flow.ps);

  return {
    success: true,
    attackRoll,
    damage: {
      totalDamage: damageCalculation.totalDamage,
      finalDamage: totalFinalDamage,
      breakdown: damageCalculation.breakdown,
      resistanceBreakdown: resistanceResult.breakdown,
      additionalDamageBreakdown,
    },
    targetUpdated: getP(flow, targetId),
    attackerUpdated: getP(flow, attackerId),
    allParticipantsUpdated: flow.ps,
    criticalEffectApplied,
    battleAction,
  };
}
