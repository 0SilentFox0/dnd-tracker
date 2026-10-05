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
import { appendHpChanges, type AttackFlow, fire, getP, put, settleDowned } from "./ability-flow";
import { buildAbortedAttackAction, buildBattleActionForHit } from "./actions";
import { computeHitDamage } from "./compute";
import { handleCriticalFail } from "./critical-fail";
import { applyDamageToTarget } from "./damage";
import { applyReaction, applyVampirism } from "./hit-effects";
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
    reactionDamageOverride,
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
      reactionTriggered: false,
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

  const hitDamage = computeHitDamage({
    attacker: getP(flow, attackerId),
    target: getP(flow, targetId),
    attack,
    damageRolls,
    allParticipants: flow.ps,
    attackRoll,
    damageMultiplier,
    currentRound,
    actionModifiers: actionModifiers[attackerId],
  });

  put(flow, hitDamage.updatedAttacker);
  put(flow, hitDamage.updatedTarget);

  const {
    damageCalculation,
    physicalDamage,
    totalFinalDamage,
    resistanceResult,
    additionalDamageBreakdown,
    criticalEffectApplied,
    oldHp,
  } = hitDamage;

  put(flow, applyDamageToTarget(getP(flow, targetId), totalFinalDamage).updatedTarget);
  settleDowned(flow, targetId, attackerId);

  fire(flow, { type: "hit", actorId: attackerId, targetId, attackKind, damage: resistanceResult.finalDamage });

  const vampirismResult = applyVampirism(getP(flow, attackerId), totalFinalDamage, attack.type);

  put(flow, vampirismResult.updatedAttacker);

  fire(flow, { type: "attack", phase: "after", actorId: attackerId, targetId, attackKind });

  const ignoreReactions = criticalEffectApplied?.effect.type === "ignore_reactions";

  const reactionResult = isUp(getP(flow, targetId))
    ? applyReaction(getP(flow, targetId), getP(flow, attackerId), !!ignoreReactions, reactionDamageOverride, attack.type, flow.ps)
    : null;

  if (reactionResult) {
    put(flow, reactionResult.updatedDefender);
    put(flow, reactionResult.updatedAttacker);
    settleDowned(flow, attackerId, targetId);
  }

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
    beforeMessages: [],
    afterMessages: flow.messages,
    vampirismHeal: vampirismResult.vampirismHeal,
    reactionTriggered: reactionResult?.reactionTriggered ?? false,
    reactionDamage: reactionResult?.reactionDamage ?? 0,
    reactionBaseDamage: reactionResult?.reactionBaseDamage ?? 0,
    reactionBonusPercent: reactionResult?.reactionBonusPercent ?? 0,
    reactionAttackerHpChange: reactionResult?.reactionAttackerHpChange ?? null,
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
    reactionTriggered: reactionResult?.reactionTriggered ?? false,
    reactionDamage: reactionResult?.reactionDamage ?? 0,
    battleAction,
  };
}
