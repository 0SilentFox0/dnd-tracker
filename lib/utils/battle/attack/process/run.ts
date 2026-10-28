import { buildAbortedAttackAction, buildBattleActionForHit } from "./actions";
import { handleCriticalFail } from "./critical-fail";
import { resolveHit } from "./hit";
import { handleMiss } from "./miss";

import { collectModifiers, findFlags } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { isActive, isAttackable, withSelf } from "@/lib/utils/abilities/engine/core/participants";
import { spendAttack } from "@/lib/utils/battle/attack/attacks-left";
import { isAdjacentAttack } from "@/lib/utils/battle/attack/bonus";
import { activeEffectIds, consumeAttackEffects } from "@/lib/utils/battle/attack/consume-effects";
import { critDamageRolls, critDoublesDice } from "@/lib/utils/battle/attack/crit-dice";
import { cancelCritIfImmune } from "@/lib/utils/battle/attack/crit-immunity";
import { critFlavorFor } from "@/lib/utils/battle/attack/critical";
import { calculateAttackRoll, eventRollMode } from "@/lib/utils/battle/attack/roll";
import { attackSourceOf } from "@/lib/utils/battle/attack/source";
import { type ActionFlow, appendHpChanges, fire, getP, put } from "@/lib/utils/battle/common/action-flow";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import { damageDiceSlots, heroAttackDamageParts } from "@/lib/utils/battle/damage/hero-damage";
import { attackDiceRolls } from "@/lib/utils/battle/dice-record";
import { getEffectiveArmorClass } from "@/lib/utils/battle/participant";
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
    allParticipants,
    currentRound,
    battleId,
    damageMultiplier,
  } = params;

  let { damageRolls } = params;

  let damageFrom = params.serverRolled?.damageFrom;

  const attackerId = attacker.basicInfo.id;

  const targetId = target.basicInfo.id;

  const attackKind = attackKindOf(attack.type);

  const before = withSelf(withSelf(allParticipants, target), attacker);

  const flow: ActionFlow = { ps: before, messages: [], summons: [], ctx: { round: currentRound, rng: params.rng ?? Math.random, map: params.map, rules: params.rules } };

  const existedBefore = activeEffectIds(flow.ps);

  // дія витрачається до подій атаки: «оновлення дії» від вбивства чи «+1 дія» мають пережити цей удар
  if (!params.actionSpent) {
    const attacker = getP(flow, attackerId);

    put(flow, params.offHand ? { ...attacker, actionFlags: { ...attacker.actionFlags, hasUsedBonusAction: true } } : spendAttack(attacker, flow.ps, attack));
  }

  const consume = (r: Omit<ProcessAttackResult, "summons">, hit: boolean): ProcessAttackResult => {
    flow.ps = consumeAttackEffects(flow.ps, { attackerId, targetId, hit, existedBefore });

    return { ...r, summons: flow.summons, allParticipantsUpdated: flow.ps, attackerUpdated: getP(flow, attackerId), targetUpdated: getP(flow, targetId) };
  };

  const { actionModifiers } = fire(flow, { type: "attack", phase: "before", actorId: attackerId, targetId, attackKind, ...attackSourceOf(attack) });

  if (!isAttackable(getP(flow, targetId)) || !isActive(getP(flow, attackerId))) {
    const battleAction = buildAbortedAttackAction(getP(flow, attackerId), target, attack, flow.messages, battleId, currentRound);

    appendHpChanges(battleAction, before, flow.ps);

    return {
      success: false,
      summons: flow.summons,
      attackRoll: calculateAttackRoll(getP(flow, attackerId), attack, d20Roll, advantageRoll, disadvantageRoll, { participants: flow.ps, rng: flow.ctx.rng, manualMode: params.rollMode, rules: flow.ctx.rules, map: flow.ctx.map, inspiration: params.inspiration }),
      targetUpdated: getP(flow, targetId),
      attackerUpdated: getP(flow, attackerId),
      allParticipantsUpdated: flow.ps,
      battleAction,
    };
  }

  const rolled = calculateAttackRoll(getP(flow, attackerId), attack, d20Roll, advantageRoll, disadvantageRoll, {
    participants: flow.ps,
    extra: actionModifiers[attackerId],
    targetId,
    targetExtra: actionModifiers[targetId],
    rng: flow.ctx.rng,
    manualMode: params.rollMode,
    rules: flow.ctx.rules,
    map: flow.ctx.map,
    inspiration: params.inspiration,
  });

  const second = rolled.secondRoll;

  if (second) {
    flow.messages.push(`🎲 ${second.mode === "advantage" ? "перевага" : "недолік"}${second.manual ? " (вибір гравця)" : ""}: другий d20 = ${second.value}${second.serverRolled ? " (сервер)" : ""}, обрано ${rolled.chosenD20}`);
  }

  let slots = damageDiceSlots(getP(flow, attackerId), attack);

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
      damageServerFrom: damageFrom,
    });

    return action;
  };

  const targetAC = getEffectiveArmorClass(getP(flow, targetId), flow.ps, actionModifiers[targetId]);

  const guaranteedHit = findFlags(flow.ps, attackerId, "guaranteedHit", actionModifiers[attackerId]).length > 0;

  const isHit = !rolled.isCriticalFail && (rolled.isCritical || guaranteedHit || rolled.totalAttackValue >= targetAC);

  const adjacentCrit =
    isHit && !rolled.isCritical && collectModifiers(flow.ps, targetId, { flag: "autoCritAdjacent" }, actionModifiers[targetId]).entries.length > 0 && isAdjacentAttack(getP(flow, attackerId), getP(flow, targetId), attack);

  const critRoll = adjacentCrit ? { ...rolled, isCritical: true } : rolled;

  if (adjacentCrit) flow.messages.push("💥 влучання впритул — критичне");

  const immune = isHit ? cancelCritIfImmune(critRoll, flow.ps, targetId, actionModifiers[targetId]) : { roll: critRoll, cancelled: false };

  const attackRoll = immune.roll;

  if (immune.cancelled) flow.messages.push("🛡 крит скасовано — звичайне влучання");

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

  if (critDoublesDice(flow.ctx.rules, attackRoll.isCritical)) {
    const doubled = critDamageRolls({ formula: heroAttackDamageParts(getP(flow, attackerId), attack).formula, rolls: damageRolls, rng: flow.ctx.rng });

    if (doubled.serverRolled.length > 0) damageFrom = Math.min(damageFrom ?? damageRolls.length, damageRolls.length);

    damageRolls = doubled.rolls;
    slots = [...slots, ...slots];
    flow.messages.push(`🎲 крит: кубики шкоди подвоєно${doubled.serverRolled.length ? ` (сервер: ${doubled.serverRolled.join(", ")})` : ""}`);
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

  fire(flow, { type: "attack", phase: "after", actorId: attackerId, targetId, attackKind, ...attackSourceOf(attack), ...eventRollMode(attackRoll) });

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
