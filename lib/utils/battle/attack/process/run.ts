import {
  applyMainActionUsed,
  getEffectiveArmorClass,
} from "../../participant";
import type {
  ProcessAttackParams,
  ProcessAttackResult,
} from "../../types/attack-process";
import { activeEffectIds, consumeAttackEffects } from "../consume-effects";
import { critFlavorFor } from "../critical";
import { calculateAttackRoll } from "..";
import { appendHpChanges, type AttackFlow, fire, getP, put } from "./ability-flow";
import { buildAbortedAttackAction, buildBattleActionForHit } from "./actions";
import { handleCriticalFail } from "./critical-fail";
import { resolveHit } from "./hit";
import { handleMiss } from "./miss";

import { findFlags } from "@/lib/utils/abilities/engine/collect-modifiers";
import { isActive, withSelf } from "@/lib/utils/abilities/engine/participants";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";

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

  const attackKind = attackKindOf(attack.type);

  const before = withSelf(withSelf(allParticipants, target), attacker);

  const flow: AttackFlow = { ps: before, messages: [], ctx: { round: currentRound, rng: params.rng ?? Math.random } };

  const existedBefore = activeEffectIds(flow.ps);

  const consume = (r: ProcessAttackResult, hit: boolean): ProcessAttackResult => {
    flow.ps = consumeAttackEffects(flow.ps, { attackerId, targetId, hit, existedBefore });

    return { ...r, allParticipantsUpdated: flow.ps, attackerUpdated: getP(flow, attackerId), targetUpdated: getP(flow, targetId) };
  };

  const { actionModifiers } = fire(flow, { type: "attack", phase: "before", actorId: attackerId, targetId, attackKind });

  if (!isActive(getP(flow, targetId)) || !isActive(getP(flow, attackerId))) {
    put(flow, applyMainActionUsed(getP(flow, attackerId)));

    const battleAction = buildAbortedAttackAction(getP(flow, attackerId), target, attack, flow.messages, battleId, currentRound);

    appendHpChanges(battleAction, before, flow.ps);

    return {
      success: false,
      attackRoll: calculateAttackRoll(getP(flow, attackerId), attack, d20Roll, advantageRoll, disadvantageRoll, { participants: flow.ps, rng: flow.ctx.rng }),
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
    rng: flow.ctx.rng,
  });

  const second = attackRoll.secondRoll;

  if (second) {
    flow.messages.push(`🎲 ${second.mode === "advantage" ? "перевага" : "недолік"}: другий d20 = ${second.value}${second.serverRolled ? " (сервер)" : ""}, обрано ${attackRoll.chosenD20}`);
  }

  const withRollDetails = <T extends { actionDetails: object }>(action: T): T => {
    if (second) Object.assign(action.actionDetails, { secondRoll: second, chosenD20: attackRoll.chosenD20 });

    return action;
  };

  const targetAC = getEffectiveArmorClass(getP(flow, targetId), flow.ps, actionModifiers[targetId]);

  const guaranteedHit = findFlags(flow.ps, attackerId, "guaranteedHit", actionModifiers[attackerId]).length > 0;

  const isHit = !attackRoll.isCriticalFail && (attackRoll.isCritical || guaranteedHit || attackRoll.totalAttackValue >= targetAC);

  const critFlavorText = attackRoll.criticalEffect
    ? critFlavorFor(attackRoll.criticalEffect, getP(flow, attackerId).basicInfo.name, getP(flow, targetId).basicInfo.name, {
        battleId,
        round: currentRound,
        attackerId,
        targetId,
      })
    : undefined;

  const branch = { critFlavorText, flow, attackerId, targetId, attack, d20Roll, attackRoll, targetAC, currentRound, battleId };

  if (attackRoll.isCriticalFail && attackRoll.criticalEffect) {
    const r = handleCriticalFail(branch);

    withRollDetails(r.battleAction);
    appendHpChanges(r.battleAction, before, flow.ps);

    return consume(r, false);
  }

  if (!isHit) {
    const r = handleMiss(branch);

    withRollDetails(r.battleAction);
    appendHpChanges(r.battleAction, before, flow.ps);

    return consume(r, false);
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
    bonusPercent: params.bonusPercent,
    bonusLabel: params.bonusLabel,
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
    critFlavorText,
  });

  withRollDetails(battleAction);
  appendHpChanges(battleAction, before, flow.ps);

  return consume({
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
  }, true);
}
