import { textRef } from "@/lib/i18n/text-ref";
import { collectModifiers, findFlags } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { isAdjacentAttack } from "@/lib/utils/battle/attack/bonus";
import { cancelCritIfImmune } from "@/lib/utils/battle/attack/crit-immunity";
import { calculateAttackRoll } from "@/lib/utils/battle/attack/roll";
import { getEffectiveArmorClass } from "@/lib/utils/battle/participant/helpers";
import type { AttackRollResult } from "@/lib/utils/battle/types/attack";
import { rollDie } from "@/lib/utils/common/dice";
import type { ResolveAttackCtx, ResolvedAttack } from "@/lib/utils/rules/systems/types";
import type { LogLine, TextRef } from "@/types/text";

const rollMode = (second: NonNullable<AttackRollResult["secondRoll"]>) => textRef(second.mode === "advantage" ? "battleLog.roll.advantage" : "battleLog.roll.disadvantage");

function resolveOffTurn(ctx: ResolveAttackCtx, noun: TextRef): ResolvedAttack {
  const { attacker, target, attack, participants, rng } = ctx;

  const first = rollDie(20, rng);

  const second = rollDie(20, rng);

  const roll = calculateAttackRoll(attacker, attack, first, second, second, { participants, targetId: target.basicInfo.id, rng, rules: ctx.rules, map: ctx.map, crit: ctx.crit });

  const lines: LogLine[] = roll.secondRoll ? [textRef("battleLog.offTurn.second", { noun, mode: rollMode(roll.secondRoll), value: roll.secondRoll.value })] : [];

  const targetAC = getEffectiveArmorClass(target, participants);

  const guaranteedHit = findFlags(participants, attacker.basicInfo.id, "guaranteedHit").length > 0;

  const isHit = !roll.isCriticalFail && (roll.isCritical || guaranteedHit || roll.totalAttackValue >= targetAC);

  return { isHit, attackRoll: roll, defenseValue: targetAC, lines };
}

export function resolveD20Attack(ctx: ResolveAttackCtx): ResolvedAttack {
  if (ctx.offTurn) return resolveOffTurn(ctx, ctx.offTurn.noun);

  const { attacker, target, attack, participants, rng, modifiers = {} } = ctx;

  const attackerId = attacker.basicInfo.id;

  const targetId = target.basicInfo.id;

  const rolled = calculateAttackRoll(attacker, attack, ctx.manualRoll ?? rollDie(20, rng), ctx.roll?.advantage, ctx.roll?.disadvantage, {
    participants,
    extra: modifiers[attackerId],
    targetId,
    targetExtra: modifiers[targetId],
    rng,
    manualMode: ctx.roll?.mode,
    rules: ctx.rules,
    map: ctx.map,
    inspiration: ctx.roll?.inspiration,
    crit: ctx.crit,
  });

  const lines: LogLine[] = [];

  const second = rolled.secondRoll;

  if (second) {
    lines.push(textRef("battleLog.roll.second", { mode: rollMode(second), manual: second.manual ? textRef("battleLog.roll.manualTag") : "", value: second.value, server: second.serverRolled ? textRef("battleLog.roll.serverTag") : "", chosen: rolled.chosenD20 }));
  }

  const targetAC = getEffectiveArmorClass(target, participants, modifiers[targetId]);

  const guaranteedHit = findFlags(participants, attackerId, "guaranteedHit", modifiers[attackerId]).length > 0;

  const isHit = !rolled.isCriticalFail && (rolled.isCritical || guaranteedHit || rolled.totalAttackValue >= targetAC);

  const adjacentCrit = isHit && !rolled.isCritical && collectModifiers(participants, targetId, { flag: "autoCritAdjacent" }, modifiers[targetId]).entries.length > 0 && isAdjacentAttack(attacker, target, attack);

  const critRoll = adjacentCrit ? { ...rolled, isCritical: true } : rolled;

  if (adjacentCrit) lines.push(textRef("battleLog.crit.adjacent"));

  const immune = isHit ? cancelCritIfImmune(critRoll, participants, targetId, modifiers[targetId]) : { roll: critRoll, cancelled: false };

  if (immune.cancelled) lines.push(textRef("battleLog.crit.cancelled"));

  return { isHit, attackRoll: immune.roll, defenseValue: targetAC, lines };
}

export function d20AbortedRoll(ctx: ResolveAttackCtx): AttackRollResult {
  const d20Roll = ctx.manualRoll ?? rollDie(20, ctx.rng);

  return calculateAttackRoll(ctx.attacker, ctx.attack, d20Roll, ctx.roll?.advantage, ctx.roll?.disadvantage, { participants: ctx.participants, rng: ctx.rng, manualMode: ctx.roll?.mode, rules: ctx.rules, map: ctx.map, inspiration: ctx.roll?.inspiration });
}
