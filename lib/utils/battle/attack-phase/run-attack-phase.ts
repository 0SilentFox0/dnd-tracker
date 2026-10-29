import { holdBackNewEffects, restoreHeldBack } from "./hold-back";
import { type AttackRequest, validateAttackRequest } from "./request";
import { damageDiceCursor, damageFractions, strikeD20 } from "./strike-rolls";
import { resolveAttackTargets } from "./targets";

import { AttackType } from "@/lib/constants/battle";
import { textRef } from "@/lib/i18n/text-ref";
import { findFlagsMany } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { findParticipant, isActive, mergeParticipants, withSelf } from "@/lib/utils/abilities/engine/core/participants";
import type { Rng, SummonRequest } from "@/lib/utils/abilities/engine/core/types";
import { processAttack } from "@/lib/utils/battle/attack";
import { activeEffectIds } from "@/lib/utils/battle/attack/consume-effects";
import { critDoublesDice } from "@/lib/utils/battle/attack/crit-dice";
import { nextChainTarget } from "@/lib/utils/battle/attack/process/chain";
import { resolveRetaliation } from "@/lib/utils/battle/attack/retaliation";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import type { CritPicker } from "@/lib/utils/battle/crit-choice/types";
import { damageDiceSlots, heroAttackDamageParts } from "@/lib/utils/battle/damage/hero-damage";
import { lineOfFire } from "@/lib/utils/battle/grid";
import { withLines } from "@/lib/utils/battle/log/lines";
import type { ProcessAttackResult } from "@/lib/utils/battle/types/attack-process";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import { rollDie } from "@/lib/utils/common/dice";
import { rngOf } from "@/lib/utils/common/rng";
import type { Ruleset } from "@/lib/utils/rules";
import type { ActiveEffect, BattleAction, BattleMapConfig, BattleParticipant } from "@/types/battle";

export type AttackPhaseInput = {
  battle: {
    initiativeOrder: BattleParticipant[];
    currentRound: number;
    currentTurnIndex: number;
  };
  data: AttackRequest;
  battleId: string;
  userId: string;
  isDM: boolean;
  rng?: Rng;
  serverRolls?: boolean;
  crit?: CritPicker;
  map?: BattleMapConfig | null;
  rules?: Ruleset;
  hitSpells?: ReadonlyMap<string, CastableSpell>;
};

export type AttackPhaseResult = {
  finalInitiativeOrder: BattleParticipant[];
  allBattleActions: BattleAction[];
  summons: SummonRequest[];
};

interface PhaseCtx {
  input: AttackPhaseInput;
  request: ReturnType<typeof validateAttackRequest>;
  rng: Rng;
  dice: ReturnType<typeof damageDiceCursor>;
  expanded: boolean;
  effectsBeforeVolley: ReturnType<typeof activeEffectIds>;
}

interface PhaseState {
  order: BattleParticipant[];
  attacker: BattleParticipant;
  actions: BattleAction[];
  summons: SummonRequest[];
  heldBack: ActiveEffect[];
}

interface StrikeOpts {
  serverRolled: boolean;
  multiplier?: number;
  cover: boolean;
}

const liveOf = (st: PhaseState, p: BattleParticipant) => findParticipant(st.order, p.basicInfo.id) ?? p;

// Фаза атаки: валідація, processAttack на ціль, відповідний удар по основній цілі.
export function runAttackPhase(input: AttackPhaseInput): AttackPhaseResult {
  const { battle, data, isDM, userId } = input;

  const rng = rngOf(input);

  const initiativeOrder = battle.initiativeOrder;

  const request = validateAttackRequest({ participants: initiativeOrder, scene: { turnIndex: battle.currentTurnIndex }, userId, isDM }, data);

  const { attacker, attack, chosenTargets, targetIds } = request;

  const flags = findFlagsMany(withSelf(initiativeOrder, attacker), attacker.basicInfo.id, ["attackHitsAllEnemies", "piercingShot", "multiTargetFalloff", "chainShot"]);

  const { targets, expanded, piercing, volley, falloff, serverRolledFrom, chain } = resolveAttackTargets({ order: initiativeOrder, attacker, attack, chosen: chosenTargets, targetIds, map: input.map, flags });

  const fractions = damageFractions(targets, attack, { volley, falloff });

  const damageFormula = (volley && (targets.length > 1 || expanded)) || chain ? heroAttackDamageParts(attacker, attack).formula : null;

  const ctx: PhaseCtx = { input, request, rng, dice: damageDiceCursor(data.damageRolls, damageFormula, rng), expanded, effectsBeforeVolley: activeEffectIds([attacker]) };

  const st: PhaseState = { order: initiativeOrder, attacker: { ...attacker }, actions: [], summons: [], heldBack: [] };

  const isRanged = attackKindOf(attack.type) === AttackType.RANGED;

  let firstHit = false;

  for (let i = 0; i < targets.length; i++) {
    // пробивний летить крізь цілі: штраф лише на першу
    const result = strikeAt(ctx, st, targets[i], i, { serverRolled: i >= serverRolledFrom, multiplier: targets.length > 1 ? fractions[i] : undefined, cover: isRanged && !(piercing && i > 0) });

    if (i === 0) firstHit = result.success;

    if (!isActive(st.attacker)) break;
  }

  if (chain && firstHit) runChain(ctx, st, targets[0], chain);

  return {
    finalInitiativeOrder: restoreHeldBack(st.order, attacker.basicInfo.id, st.heldBack),
    allBattleActions: st.actions,
    summons: st.summons,
  };
}

function runChain(ctx: PhaseCtx, st: PhaseState, first: BattleParticipant, chain: { jumps: number; percent: number }): void {
  const { attack } = ctx.request;

  const hit = new Set([first.basicInfo.id]);

  let from = liveOf(st, first);

  for (let jump = 1; jump <= chain.jumps && isActive(st.attacker); jump++) {
    const next = nextChainTarget({ map: ctx.input.map, order: st.order, attacker: st.attacker, attack, from, hit });

    if (!next) break;

    const result = strikeAt(ctx, st, next, jump, { serverRolled: true, multiplier: chain.percent ** jump, cover: false });

    result.battleAction.actionDetails.chainFromId = from.basicInfo.id;
    hit.add(next.basicInfo.id);

    if (!result.success) break;

    from = liveOf(st, next);
  }
}

function rollStrike(ctx: PhaseCtx, target: BattleParticipant, i: number, opts: StrikeOpts) {
  const { input, request, rng } = ctx;

  const { data } = input;

  const { attacker, attack, chosenTargets } = request;

  const chosenAt = ctx.expanded ? chosenTargets.findIndex((t) => t.basicInfo.id === target.basicInfo.id) : i;

  const serverD20 = input.serverRolls || opts.serverRolled;

  const strike = serverD20 ? { value: rollDie(20, rng), serverRolled: true } : strikeD20(data, request, { index: i, chosenAt, expanded: ctx.expanded }, rng);

  const serverDamage = input.serverRolls ? damageDiceSlots(attacker, attack).map(sides => rollDie(sides, rng)) : null;

  const strikeDice = serverDamage ? { rolls: serverDamage, serverRolled: serverDamage } : ctx.dice.next();

  const second = serverD20 ? undefined : (data.secondRolls?.[chosenAt] ?? data.advantageRoll ?? data.disadvantageRoll);

  return { strike, strikeDice, second };
}

function strikeAt(ctx: PhaseCtx, st: PhaseState, target: BattleParticipant, i: number, opts: StrikeOpts): ProcessAttackResult {
  const { input, request, rng } = ctx;

  const { data, battle, battleId } = input;

  const { attack } = request;

  const { strike, strikeDice, second } = rollStrike(ctx, target, i, opts);

  const victim = liveOf(st, target);

  const obstacle = opts.cover && lineOfFire(input.map, st.order, st.attacker, victim).blocked;

  const attackResult = processAttack({
    attacker: st.attacker,
    target: victim,
    attack,
    d20Roll: strike.value,
    advantageRoll: second,
    disadvantageRoll: second,
    rollMode: data.rollMode,
    inspiration: !!data.useInspiration && i === 0,
    actionSpent: i > 0,
    offHand: data.offHand,
    damageRolls: strikeDice.rolls,
    allParticipants: st.order,
    currentRound: battle.currentRound,
    battleId,
    damageMultiplier: opts.multiplier,
    obstacle,
    cunningStrike: i === 0 ? data.cunningStrike : undefined,
    map: input.map,
    rules: input.rules,
    hitSpells: input.hitSpells,
    rng,
    crit: input.crit,
    recordDice: true,
    serverRolled: { d20: strike.serverRolled, ...(strikeDice.serverRolled && { damageFrom: strikeDice.rolls.length - strikeDice.serverRolled.length }) },
  });

  if (attackResult.success) ctx.dice.hit(critDoublesDice(input.rules, !!attackResult.attackRoll?.isCritical));

  st.order = mergeParticipants(st.order, attackResult.allParticipantsUpdated ?? []);
  st.attacker = attackResult.attackerUpdated;
  st.summons.push(...attackResult.summons);

  if (strikeDice.serverRolled && attackResult.success) {
    attackResult.battleAction = withLines(attackResult.battleAction, [textRef("battleLog.attack.serverDamageDice", { rolls: strikeDice.serverRolled.join(", ") })]);
  }

  st.actions.push(attackResult.battleAction);

  const provoked = attackResult.criticalEffectApplied?.effect.type === "provoke_opportunity_attack";

  if (i === 0 || provoked) retaliate(ctx, st, target, attackResult, provoked);

  const held = holdBackNewEffects(st.order, st.attacker, ctx.effectsBeforeVolley);

  st.order = held.order;
  st.attacker = held.attacker;
  st.heldBack.push(...held.held);

  return attackResult;
}

function retaliate(ctx: PhaseCtx, st: PhaseState, target: BattleParticipant, attackResult: ProcessAttackResult, provoked: boolean): void {
  const { input, request, rng } = ctx;

  const { attacker } = request;

  const retaliation = resolveRetaliation({
    participants: st.order,
    attackerId: attacker.basicInfo.id,
    defenderId: target.basicInfo.id,
    attack: request.attack,
    attackRoll: attackResult.attackRoll,
    criticalEffect: attackResult.criticalEffectApplied,
    provoked,
    round: input.battle.currentRound,
    battleId: input.battleId,
    rng,
    crit: input.crit,
    map: input.map,
    rules: input.rules,
  });

  if (!retaliation) return;

  st.order = mergeParticipants(st.order, retaliation.participants);
  st.attacker = findParticipant(retaliation.participants, attacker.basicInfo.id) ?? st.attacker;
  st.actions.push(retaliation.battleAction);
}
