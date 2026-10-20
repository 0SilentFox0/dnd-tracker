import { buildAbortedAttackAction, buildBattleActionForHit } from "./actions";
import { handleCriticalFail } from "./critical-fail";
import { resolveHit } from "./hit";
import { handleMiss } from "./miss";

import { findFlags } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { isActive, withSelf } from "@/lib/utils/abilities/engine/core/participants";
import { activeEffectIds, consumeAttackEffects } from "@/lib/utils/battle/attack/consume-effects";
import { critFlavorFor } from "@/lib/utils/battle/attack/critical";
import { calculateAttackRoll } from "@/lib/utils/battle/attack/roll";
import { type ActionFlow, appendHpChanges, fire, getP, put } from "@/lib/utils/battle/common/action-flow";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import { damageDiceSlots } from "@/lib/utils/battle/damage/hero-damage";
import { attackDiceRolls } from "@/lib/utils/battle/dice-record";
import { applyMainActionUsed, getEffectiveArmorClass } from "@/lib/utils/battle/participant";
import type { ProcessAttackParams, ProcessAttackResult } from "@/lib/utils/battle/types/attack-process";
import type { BattleAction } from "@/types/battle";

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

  const flow: ActionFlow = { ps: before, messages: [], summons: [], ctx: { round: currentRound, rng: params.rng ?? Math.random, map: params.map } };

  const existedBefore = activeEffectIds(flow.ps);

  // дія витрачається до подій атаки: «оновлення дії» від вбивства чи «+1 дія» мають пережити цей удар
  if (!params.actionSpent) put(flow, applyMainActionUsed(getP(flow, attackerId)));

  const consume = (r: Omit<ProcessAttackResult, "summons">, hit: boolean): ProcessAttackResult => {
    flow.ps = consumeAttackEffects(flow.ps, { attackerId, targetId, hit, existedBefore });

    return { ...r, summons: flow.summons, allParticipantsUpdated: flow.ps, attackerUpdated: getP(flow, attackerId), targetUpdated: getP(flow, targetId) };
  };

  const { actionModifiers } = fire(flow, { type: "attack", phase: "before", actorId: attackerId, targetId, attackKind });

  if (!isActive(getP(flow, targetId)) || !isActive(getP(flow, attackerId))) {
    const battleAction = buildAbortedAttackAction(getP(flow, attackerId), target, attack, flow.messages, battleId, currentRound);

    appendHpChanges(battleAction, before, flow.ps);

    return {
      success: false,
      summons: flow.summons,
      attackRoll: calculateAttackRoll(getP(flow, attackerId), attack, d20Roll, advantageRoll, disadvantageRoll, { participants: flow.ps, rng: flow.ctx.rng, manualMode: params.rollMode }),
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
    manualMode: params.rollMode,
  });

  const second = attackRoll.secondRoll;

  if (second) {
    flow.messages.push(`🎲 ${second.mode === "advantage" ? "перевага" : "недолік"}${second.manual ? " (вибір гравця)" : ""}: другий d20 = ${second.value}${second.serverRolled ? " (сервер)" : ""}, обрано ${attackRoll.chosenD20}`);
  }

  const slots = damageDiceSlots(getP(flow, attackerId), attack);

  const withRollDetails = <T extends { actionDetails: BattleAction["actionDetails"] }>(action: T): T => {
    if (second) Object.assign(action.actionDetails, { secondRoll: second, chosenD20: attackRoll.chosenD20 });

    const damage = (action.actionDetails.damageRolls ?? []).flatMap((r) => r.results);

    if (!params.recordDice) return action;

    action.actionDetails.diceRolls = attackDiceRolls({
      attackerId,
      targetId,
      d20: d20Roll,
      d20Server: params.serverRolled?.d20,
      ...(second && { second, chosenD20: attackRoll.chosenD20 }),
      damage,
      slots,
      damageServerFrom: params.serverRolled?.damageFrom,
    });

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
    obstacle: params.obstacle,
    hitSpells: params.hitSpells,
    battleId,
  });

  if (params.obstacle) flow.messages.unshift(`🧱 перешкода: шкода ×0.5 → ${hitDamage.totalFinalDamage}`);

  fire(flow, { type: "attack", phase: "after", actorId: attackerId, targetId, attackKind });

  const battleAction = buildBattleActionForHit({
    attacker: getP(flow, attackerId),
    target: getP(flow, targetId),
    attack,
    d20Roll,
    damageRolls,
    attackRoll,
    targetAC,
    hitDamage,
    messages: flow.messages,
    vampirismHeal,
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
      totalDamage: hitDamage.damageCalculation.totalDamage,
      finalDamage: hitDamage.totalFinalDamage,
      breakdown: hitDamage.damageCalculation.breakdown,
      resistanceBreakdown: hitDamage.resistanceResult.breakdown,
      additionalDamageBreakdown: hitDamage.additionalDamageBreakdown,
    },
    targetUpdated: getP(flow, targetId),
    attackerUpdated: getP(flow, attackerId),
    allParticipantsUpdated: flow.ps,
    criticalEffectApplied: hitDamage.criticalEffectApplied,
    battleAction,
  }, true);
}
