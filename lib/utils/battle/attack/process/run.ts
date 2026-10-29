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
import type { AttackRollResult } from "@/lib/utils/battle/types/attack";
import type { ProcessAttackParams, ProcessAttackResult } from "@/lib/utils/battle/types/attack-process";
import { rngOf } from "@/lib/utils/common/rng";
import type { BattleAction, BattleParticipant } from "@/types/battle";

export type { ProcessAttackParams, ProcessAttackResult };

type Modifiers = ReturnType<typeof fire>["actionModifiers"];

interface AttackRun {
  params: ProcessAttackParams;
  flow: ActionFlow;
  before: BattleParticipant[];
  attackerId: string;
  targetId: string;
  existedBefore: ReturnType<typeof activeEffectIds>;
}

interface DiceState {
  slots: ReturnType<typeof damageDiceSlots>;
  damageFrom: number | undefined;
  damageRolls: number[];
}

type SecondRoll = AttackRollResult["secondRoll"];

export function processAttack(params: ProcessAttackParams): ProcessAttackResult {
  const { attacker, target, attack, d20Roll, advantageRoll, disadvantageRoll, allParticipants, currentRound } = params;

  const attackerId = attacker.basicInfo.id;

  const targetId = target.basicInfo.id;

  const before = withSelf(withSelf(allParticipants, target), attacker);

  const flow: ActionFlow = { ps: before, messages: [], summons: [], ctx: { round: currentRound, rng: rngOf(params), map: params.map, rules: params.rules, crit: params.crit } };

  const run: AttackRun = { params, flow, before, attackerId, targetId, existedBefore: activeEffectIds(flow.ps) };

  spendAttackAction(run);

  const { actionModifiers } = fire(flow, { type: "attack", phase: "before", actorId: attackerId, targetId, attackKind: attackKindOf(attack.type), ...attackSourceOf(attack) });

  if (!isAttackable(getP(flow, targetId)) || !isActive(getP(flow, attackerId))) return abortedResult(run);

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
    crit: flow.ctx.crit,
  });

  const second = rolled.secondRoll;

  if (second) {
    flow.messages.push(`🎲 ${second.mode === "advantage" ? "перевага" : "недолік"}${second.manual ? " (вибір гравця)" : ""}: другий d20 = ${second.value}${second.serverRolled ? " (сервер)" : ""}, обрано ${rolled.chosenD20}`);
  }

  const dice: DiceState = { slots: damageDiceSlots(getP(flow, attackerId), attack), damageFrom: params.serverRolled?.damageFrom, damageRolls: params.damageRolls };

  const targetAC = getEffectiveArmorClass(getP(flow, targetId), flow.ps, actionModifiers[targetId]);

  const { isHit, attackRoll } = judgeHit(run, rolled, targetAC, actionModifiers);

  const critFlavorText = attackRoll.criticalEffect
    ? critFlavorFor(attackRoll.criticalEffect, getP(flow, attackerId).basicInfo.name, getP(flow, targetId).basicInfo.name, {
        battleId: params.battleId,
        round: currentRound,
        attackerId,
        targetId,
      })
    : undefined;

  const finish = <T extends { actionDetails: BattleAction["actionDetails"] }>(action: T): T => withRollDetails(run, action, attackRoll, second, dice);

  const branch = { critFlavorText, flow, attackerId, targetId, attack, d20Roll, attackRoll, targetAC, currentRound, battleId: params.battleId };

  if (attackRoll.isCriticalFail && attackRoll.criticalEffect) {
    const r = handleCriticalFail(branch);

    finish(r.battleAction);
    appendHpChanges(r.battleAction, before, flow.ps);

    return consume(run, r, false);
  }

  if (!isHit) {
    const r = handleMiss(branch);

    finish(r.battleAction);
    appendHpChanges(r.battleAction, before, flow.ps);

    return consume(run, r, false);
  }

  return hitResult(run, { attackRoll, targetAC, critFlavorText, dice, actionModifiers, finish });
}

function spendAttackAction(run: AttackRun): void {
  const { params, flow, attackerId } = run;

  // дія витрачається до подій атаки: «оновлення дії» від вбивства чи «+1 дія» мають пережити цей удар
  if (params.actionSpent) return;

  const attacker = getP(flow, attackerId);

  put(flow, params.offHand ? { ...attacker, actionFlags: { ...attacker.actionFlags, hasUsedBonusAction: true } } : spendAttack(attacker, flow.ps, params.attack));
}

function consume(run: AttackRun, r: Omit<ProcessAttackResult, "summons">, hit: boolean): ProcessAttackResult {
  const { flow, attackerId, targetId, existedBefore } = run;

  flow.ps = consumeAttackEffects(flow.ps, { attackerId, targetId, hit, existedBefore });

  return { ...r, summons: flow.summons, allParticipantsUpdated: flow.ps, attackerUpdated: getP(flow, attackerId), targetUpdated: getP(flow, targetId) };
}

function abortedResult(run: AttackRun): ProcessAttackResult {
  const { params, flow, before, attackerId, targetId } = run;

  const battleAction = buildAbortedAttackAction(getP(flow, attackerId), params.target, params.attack, flow.messages, params.battleId, params.currentRound);

  appendHpChanges(battleAction, before, flow.ps);

  return {
    success: false,
    summons: flow.summons,
    attackRoll: calculateAttackRoll(getP(flow, attackerId), params.attack, params.d20Roll, params.advantageRoll, params.disadvantageRoll, { participants: flow.ps, rng: flow.ctx.rng, manualMode: params.rollMode, rules: flow.ctx.rules, map: flow.ctx.map, inspiration: params.inspiration }),
    targetUpdated: getP(flow, targetId),
    attackerUpdated: getP(flow, attackerId),
    allParticipantsUpdated: flow.ps,
    battleAction,
  };
}

function judgeHit(run: AttackRun, rolled: AttackRollResult, targetAC: number, actionModifiers: Modifiers): { isHit: boolean; attackRoll: AttackRollResult } {
  const { flow, attackerId, targetId, params } = run;

  const guaranteedHit = findFlags(flow.ps, attackerId, "guaranteedHit", actionModifiers[attackerId]).length > 0;

  const isHit = !rolled.isCriticalFail && (rolled.isCritical || guaranteedHit || rolled.totalAttackValue >= targetAC);

  const adjacentCrit =
    isHit && !rolled.isCritical && collectModifiers(flow.ps, targetId, { flag: "autoCritAdjacent" }, actionModifiers[targetId]).entries.length > 0 && isAdjacentAttack(getP(flow, attackerId), getP(flow, targetId), params.attack);

  const critRoll = adjacentCrit ? { ...rolled, isCritical: true } : rolled;

  if (adjacentCrit) flow.messages.push("💥 влучання впритул — критичне");

  const immune = isHit ? cancelCritIfImmune(critRoll, flow.ps, targetId, actionModifiers[targetId]) : { roll: critRoll, cancelled: false };

  if (immune.cancelled) flow.messages.push("🛡 крит скасовано — звичайне влучання");

  return { isHit, attackRoll: immune.roll };
}

function withRollDetails<T extends { actionDetails: BattleAction["actionDetails"] }>(run: AttackRun, action: T, attackRoll: AttackRollResult, second: SecondRoll, dice: DiceState): T {
  const { params, attackerId, targetId } = run;

  if (second) Object.assign(action.actionDetails, { secondRoll: second, chosenD20: attackRoll.chosenD20 });

  const damage = (action.actionDetails.damageRolls ?? []).flatMap((r) => r.results);

  if (!params.recordDice) return action;

  action.actionDetails.diceRolls = attackDiceRolls({
    attackerId,
    targetId,
    d20: params.d20Roll,
    d20Server: params.serverRolled?.d20,
    ...(second && { second, chosenD20: attackRoll.chosenD20 }),
    damage,
    slots: dice.slots,
    damageServerFrom: dice.damageFrom,
  });

  return action;
}

function doubleCritDice(run: AttackRun, attackRoll: AttackRollResult, dice: DiceState): void {
  const { flow, attackerId, params } = run;

  if (!critDoublesDice(flow.ctx.rules, attackRoll.isCritical)) return;

  const doubled = critDamageRolls({ formula: heroAttackDamageParts(getP(flow, attackerId), params.attack).formula, rolls: dice.damageRolls, rng: flow.ctx.rng });

  if (doubled.serverRolled.length > 0) dice.damageFrom = Math.min(dice.damageFrom ?? dice.damageRolls.length, dice.damageRolls.length);

  dice.damageRolls = doubled.rolls;
  dice.slots = [...dice.slots, ...dice.slots];
  flow.messages.push(`🎲 крит: кубики шкоди подвоєно${doubled.serverRolled.length ? ` (сервер: ${doubled.serverRolled.join(", ")})` : ""}`);
}

interface HitStage {
  attackRoll: AttackRollResult;
  targetAC: number;
  critFlavorText: string | undefined;
  dice: DiceState;
  actionModifiers: Modifiers;
  finish: <T extends { actionDetails: BattleAction["actionDetails"] }>(action: T) => T;
}

function hitResult(run: AttackRun, stage: HitStage): ProcessAttackResult {
  const { params, flow, before, attackerId, targetId } = run;

  const { attackRoll, targetAC, critFlavorText, dice, actionModifiers } = stage;

  const { attack, currentRound, battleId } = params;

  doubleCritDice(run, attackRoll, dice);

  const { hitDamage, vampirismHeal } = resolveHit({
    flow,
    attackerId,
    targetId,
    attack,
    damageRolls: dice.damageRolls,
    attackRoll,
    damageMultiplier: params.damageMultiplier,
    currentRound,
    actionModifiers: actionModifiers[attackerId],
    bonusPercent: params.bonusPercent,
    bonusLabel: params.bonusLabel,
    obstacle: params.obstacle,
    cunningStrike: params.cunningStrike,
    hitSpells: params.hitSpells,
    battleId,
  });

  if (params.obstacle) flow.messages.unshift(`🧱 перешкода: шкода ×0.5 → ${hitDamage.totalFinalDamage}`);

  fire(flow, { type: "attack", phase: "after", actorId: attackerId, targetId, attackKind: attackKindOf(attack.type), ...attackSourceOf(attack), ...eventRollMode(attackRoll) });

  const battleAction = buildBattleActionForHit({
    attacker: getP(flow, attackerId),
    target: getP(flow, targetId),
    attack,
    d20Roll: params.d20Roll,
    damageRolls: dice.damageRolls,
    attackRoll,
    targetAC,
    hitDamage,
    messages: flow.messages,
    vampirismHeal,
    battleId,
    currentRound,
    critFlavorText,
  });

  stage.finish(battleAction);
  appendHpChanges(battleAction, before, flow.ps);

  return consume(run, {
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
