import { buildAbortedAttackAction, buildBattleActionForHit } from "./actions";
import { handleCriticalFail } from "./critical-fail";
import { resolveHit } from "./hit";
import { spendRidersOnMiss } from "./hit-rider";
import { handleMiss } from "./miss";

import { textRef } from "@/lib/i18n/text-ref";
import { isActive, isAttackable, withSelf } from "@/lib/utils/abilities/engine/core/participants";
import { spendAttack } from "@/lib/utils/battle/attack/attacks-left";
import { activeEffectIds, consumeAttackEffects } from "@/lib/utils/battle/attack/consume-effects";
import { critDamageRolls, critDoublesDice } from "@/lib/utils/battle/attack/crit-dice";
import { type CritFlavor, critFlavorOf } from "@/lib/utils/battle/attack/critical";
import { eventRollMode } from "@/lib/utils/battle/attack/event-roll-mode";
import { attackSourceOf } from "@/lib/utils/battle/attack/source";
import { type ActionFlow, appendHpChanges, fire, getP, put } from "@/lib/utils/battle/common/action-flow";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import { damageDiceSlots, heroAttackDamageParts } from "@/lib/utils/battle/damage/hero-damage";
import { attackDiceRolls } from "@/lib/utils/battle/dice-record";
import { castSpell } from "@/lib/utils/battle/spell";
import { runAutoReactions } from "@/lib/utils/battle/spell/auto-reaction";
import type { AttackRollResult } from "@/lib/utils/battle/types/attack";
import type { ProcessAttackParams, ProcessAttackResult } from "@/lib/utils/battle/types/attack-process";
import { rngOf } from "@/lib/utils/common/rng";
import { ruleSystemOf } from "@/lib/utils/rules/systems";
import type { ResolveAttackCtx } from "@/lib/utils/rules/systems/types";
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

interface Judged {
  second: SecondRoll;
  targetAC: number;
  isHit: boolean;
  attackRoll: AttackRollResult;
}

export function processAttack(params: ProcessAttackParams): ProcessAttackResult {
  const { attacker, target, attack, d20Roll, allParticipants, currentRound } = params;

  const attackerId = attacker.basicInfo.id;

  const targetId = target.basicInfo.id;

  const before = withSelf(withSelf(allParticipants, target), attacker);

  const flow: ActionFlow = { ps: before, messages: [], summons: [], ctx: { round: currentRound, rng: rngOf(params), map: params.map, rules: params.rules, crit: params.crit }, sceneState: params.sceneState };

  const run: AttackRun = { params, flow, before, attackerId, targetId, existedBefore: activeEffectIds(flow.ps) };

  spendAttackAction(run);

  const { actionModifiers } = fire(flow, { type: "attack", phase: "before", actorId: attackerId, targetId, attackKind: attackKindOf(attack.type), ...attackSourceOf(attack) });

  if (!isAttackable(getP(flow, targetId)) || !isActive(getP(flow, attackerId))) return abortedResult(run);

  const judged = judge(run, actionModifiers);

  const { second, targetAC, isHit, attackRoll } = judged;

  const dice: DiceState = { slots: damageDiceSlots(getP(flow, attackerId), attack), damageFrom: params.serverRolled?.damageFrom, damageRolls: params.damageRolls };

  const critFlavor = attackRoll.criticalEffect
    ? critFlavorOf(attackRoll.criticalEffect, getP(flow, attackerId).basicInfo.name, getP(flow, targetId).basicInfo.name, {
        battleId: params.battleId,
        round: currentRound,
        attackerId,
        targetId,
      })
    : undefined;

  const finish = <T extends { actionDetails: BattleAction["actionDetails"] }>(action: T): T => withRollDetails(run, action, attackRoll, second, dice);

  const branch = { critFlavor, flow, attackerId, targetId, attack, d20Roll, attackRoll, targetAC, currentRound, battleId: params.battleId };

  if (!isHit) spendRidersOnMiss(flow, { attackerId, attack });

  const missHandler = attackRoll.isCriticalFail && attackRoll.criticalEffect ? handleCriticalFail : !isHit ? handleMiss : undefined;

  if (missHandler) {
    reactToAttack(run);

    const r = missHandler(branch);

    finish(r.battleAction);
    appendHpChanges(r.battleAction, before, flow.ps);

    return consume(run, r, false);
  }

  return hitResult(run, { attackRoll, targetAC, critFlavor, dice, actionModifiers, finish });
}

function reactToAttack(run: AttackRun): void {
  const { flow, attackerId, targetId, params } = run;

  runAutoReactions(flow, { attackerId, targetId, targetHpBefore: params.target.combatStats.currentHp }, castSpell);
}

function spendAttackAction(run: AttackRun): void {
  const { params, flow, attackerId } = run;

  // дія витрачається до подій атаки: «оновлення дії» від вбивства чи «+1 дія» мають пережити цей удар
  if (params.actionSpent) return;

  const attacker = getP(flow, attackerId);

  put(flow, params.offHand && ruleSystemOf(flow.ctx.rules).combat.actionEconomy.bonusAction ? { ...attacker, actionFlags: { ...attacker.actionFlags, hasUsedBonusAction: true } } : spendAttack(attacker, flow.ps, params.attack));
}

function consume(run: AttackRun, r: Omit<ProcessAttackResult, "summons" | "sceneState">, hit: boolean): ProcessAttackResult {
  const { flow, attackerId, targetId, existedBefore } = run;

  flow.ps = consumeAttackEffects(flow.ps, { attackerId, targetId, hit, existedBefore });

  return { ...r, summons: flow.summons, sceneState: flow.sceneState, allParticipantsUpdated: flow.ps, attackerUpdated: getP(flow, attackerId), targetUpdated: getP(flow, targetId) };
}

function abortedResult(run: AttackRun): ProcessAttackResult {
  const { params, flow, before, attackerId, targetId } = run;

  const battleAction = buildAbortedAttackAction(getP(flow, attackerId), params.target, params.attack, flow.messages, params.battleId, params.currentRound);

  appendHpChanges(battleAction, before, flow.ps);

  return {
    success: false,
    summons: flow.summons,
    sceneState: flow.sceneState,
    attackRoll: abortedRoll(run),
    targetUpdated: getP(flow, targetId),
    attackerUpdated: getP(flow, attackerId),
    allParticipantsUpdated: flow.ps,
    battleAction,
  };
}

function attackCtx(run: AttackRun, modifiers?: Modifiers): ResolveAttackCtx {
  const { flow, attackerId, targetId, params } = run;

  return {
    attacker: getP(flow, attackerId),
    target: getP(flow, targetId),
    attack: params.attack,
    participants: flow.ps,
    rules: flow.ctx.rules,
    rng: flow.ctx.rng,
    manualRoll: params.d20Roll,
    sceneState: flow.sceneState,
    system: params.system,
    roll: { advantage: params.advantageRoll, disadvantage: params.disadvantageRoll, mode: params.rollMode, inspiration: params.inspiration },
    modifiers,
    map: flow.ctx.map,
    crit: flow.ctx.crit,
  };
}

function abortedRoll(run: AttackRun): AttackRollResult {
  return ruleSystemOf(run.flow.ctx.rules).combat.abortedRoll(attackCtx(run));
}

function judge(run: AttackRun, actionModifiers: Modifiers): Judged {
  const { flow, attackerId } = run;

  const r = ruleSystemOf(flow.ctx.rules).combat.resolveAttack(attackCtx(run, actionModifiers));

  if (r.scene) flow.sceneState = r.scene;

  flow.messages.push(...r.lines);

  if (r.attackerData) {
    const spender = getP(flow, attackerId);

    put(flow, { ...spender, battleData: { ...spender.battleData, ...r.attackerData } });
  }

  return { second: r.attackRoll.secondRoll, targetAC: r.defenseValue ?? 0, isHit: r.isHit, attackRoll: r.attackRoll };
}

function withRollDetails<T extends { actionDetails: BattleAction["actionDetails"] }>(run: AttackRun, action: T, attackRoll: AttackRollResult, second: SecondRoll, dice: DiceState): T {
  const { params, attackerId, targetId } = run;

  if (second) Object.assign(action.actionDetails, { secondRoll: second, chosenD20: attackRoll.chosenD20 });

  const damage = (action.actionDetails.damageRolls ?? []).flatMap((r) => r.results);

  if (attackRoll.system) action.actionDetails.system = attackRoll.system;

  if (!params.recordDice || attackRoll.system) return action;

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
  flow.messages.push(textRef("battleLog.crit.doubled", { server: doubled.serverRolled.length ? textRef("battleLog.crit.doubledServer", { rolls: doubled.serverRolled.join(", ") }) : "" }));
}

interface HitStage {
  attackRoll: AttackRollResult;
  targetAC: number;
  critFlavor: CritFlavor | undefined;
  dice: DiceState;
  actionModifiers: Modifiers;
  finish: <T extends { actionDetails: BattleAction["actionDetails"] }>(action: T) => T;
}

function hitResult(run: AttackRun, stage: HitStage): ProcessAttackResult {
  const { params, flow, before, attackerId, targetId } = run;

  const { attackRoll, targetAC, critFlavor, dice, actionModifiers } = stage;

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

  reactToAttack(run);

  if (params.obstacle) flow.messages.unshift(textRef("battleLog.attack.obstacle", { damage: hitDamage.totalFinalDamage }));

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
    critFlavor,
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
