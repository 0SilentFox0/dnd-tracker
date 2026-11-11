import { buildOffTurnAction, type BuildOffTurnParams } from "./process/actions";
import { resolveHit } from "./process/hit";
import { spendRidersOnMiss } from "./process/hit-rider";
import { activeEffectIds, consumeAttackEffects } from "./consume-effects";
import { critDamageRolls, critDoublesDice } from "./crit-dice";
import { applyCriticalEffect, critFlavorOf } from "./critical";
import { calculateAttackRoll } from "./roll";

import { textRef } from "@/lib/i18n/text-ref";
import { findFlags } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { isActive } from "@/lib/utils/abilities/engine/core/participants";
import { type ActionFlow, appendHpChanges, getP, put } from "@/lib/utils/battle/common/action-flow";
import { heroAttackDamageParts } from "@/lib/utils/battle/damage/hero-damage";
import { heldBy, settle } from "@/lib/utils/battle/momentum";
import { getEffectiveArmorClass } from "@/lib/utils/battle/participant";
import type { AttackRollResult } from "@/lib/utils/battle/types/attack";
import { parseDiceLenient, rollDie, rollGroups } from "@/lib/utils/common/dice";
import { ruleSystemOf } from "@/lib/utils/rules/systems";
import type { RuleSystemCombat } from "@/lib/utils/rules/systems/types";
import type { BattleAction, BattleAttack } from "@/types/battle";
import type { TextRef } from "@/types/text";

export type ServerAttackLabel = "retaliation" | "opportunity" | "readied" | "legendary";

const LABELS: Record<ServerAttackLabel, { title: TextRef; noun: TextRef }> = {
  retaliation: { title: textRef("battleLog.offTurn.titles.retaliation"), noun: textRef("battleLog.offTurn.nouns.retaliation") },
  opportunity: { title: textRef("battleLog.offTurn.titles.opportunity"), noun: textRef("battleLog.offTurn.nouns.opportunity") },
  readied: { title: textRef("battleLog.offTurn.titles.readied"), noun: textRef("battleLog.offTurn.nouns.readied") },
  legendary: { title: textRef("battleLog.offTurn.titles.legendary"), noun: textRef("battleLog.offTurn.nouns.legendary") },
};

export interface ServerAttackInput {
  flow: ActionFlow;
  attackerId: string;
  targetId: string;
  attack: BattleAttack;
  currentRound: number;
  battleId: string;
  rng: () => number;
  bonusPercent?: number;
  label: ServerAttackLabel;
}

interface ServerJudged {
  roll: AttackRollResult;
  targetAC: number;
  isHit: boolean;
}

function judgeServerWfrp(flow: ActionFlow, input: Pick<ServerAttackInput, "attackerId" | "targetId" | "attack" | "rng">, resolve: NonNullable<RuleSystemCombat["resolveAttack"]>): ServerJudged {
  const { attackerId, targetId } = input;

  const attacker = getP(flow, attackerId);

  const target = getP(flow, targetId);

  const sides = { attacker: attacker.basicInfo.side, target: target.basicInfo.side };

  const r = resolve({ attacker, target, attack: input.attack, participants: flow.ps, rules: flow.ctx.rules, rng: input.rng, momentum: { attacker: heldBy(flow.momentum, sides.attacker), defender: heldBy(flow.momentum, sides.target) } });

  const settled = settle(flow.momentum, sides, r.momentum);

  flow.momentum = settled.next;

  flow.messages.push(...r.lines);

  if (settled.gained) flow.messages.push(textRef("battleLog.percentile.momentum"));

  return { roll: r.attackRoll, targetAC: r.defenseValue ?? 0, isHit: r.isHit };
}

function judgeServerD20(flow: ActionFlow, input: Pick<ServerAttackInput, "attackerId" | "targetId" | "attack" | "rng" | "label" | "currentRound">): ServerJudged {
  const { attackerId, targetId, attack, rng, label } = input;

  const first = rollDie(20, rng);

  const second = rollDie(20, rng);

  const roll = calculateAttackRoll(getP(flow, attackerId), attack, first, second, second, { participants: flow.ps, targetId, rng, rules: flow.ctx.rules, map: flow.ctx.map, crit: flow.ctx.crit });

  if (roll.secondRoll) flow.messages.push(textRef("battleLog.offTurn.second", { noun: LABELS[label].noun, mode: textRef(roll.secondRoll.mode === "advantage" ? "battleLog.roll.advantage" : "battleLog.roll.disadvantage"), value: roll.secondRoll.value }));

  if (roll.isCriticalFail && roll.criticalEffect) put(flow, applyCriticalEffect(getP(flow, attackerId), roll.criticalEffect, input.currentRound, { offTurn: true }));

  const targetAC = getEffectiveArmorClass(getP(flow, targetId), flow.ps);

  const guaranteedHit = findFlags(flow.ps, attackerId, "guaranteedHit").length > 0;

  return { roll, targetAC, isHit: !roll.isCriticalFail && (roll.isCritical || guaranteedHit || roll.totalAttackValue >= targetAC) };
}

/** Мутує `flow.ps`; без дії та тригерів «перед/після атаки». */
export function resolveServerAttack(input: ServerAttackInput): { battleAction: BattleAction; hit: boolean; downed: boolean } {
  const { flow, attackerId, targetId, attack, currentRound: round, battleId, rng, label } = input;

  const before = flow.ps;

  const existedBefore = activeEffectIds(before);

  const resolveHook = ruleSystemOf(flow.ctx.rules).combat.resolveAttack;

  const { roll, targetAC, isHit } = resolveHook ? judgeServerWfrp(flow, input, resolveHook) : judgeServerD20(flow, input);

  let hit: BuildOffTurnParams["hit"] = null;

  if (isHit) {
    const formula = heroAttackDamageParts(getP(flow, attackerId), attack).formula;

    const single = attack.noLevelDice ? [] : rollGroups(parseDiceLenient(formula).groups, rng);

    const damageRolls = critDoublesDice(flow.ctx.rules, roll.isCritical) && !ruleSystemOf(flow.ctx.rules).combat.mitigateDamage ? critDamageRolls({ formula, rolls: single, rng }).rolls : single;

    const { hitDamage } = resolveHit({
      flow,
      attackerId,
      targetId,
      attack,
      damageRolls,
      attackRoll: roll,
      currentRound: round,
      battleId,
      bonusPercent: input.bonusPercent,
      offTurn: true,
    });

    hit = { damageRolls, hitDamage };
  } else spendRidersOnMiss(flow, { attackerId, attack });

  const crit = roll.isCriticalFail ? roll.criticalEffect : hit?.hitDamage.criticalEffectApplied;

  const critFlavor = crit
    ? critFlavorOf(crit, getP(flow, attackerId).basicInfo.name, getP(flow, targetId).basicInfo.name, { battleId, round, attackerId, targetId, suffix: "r" })
    : undefined;

  const battleAction = buildOffTurnAction({
    retaliator: getP(flow, attackerId),
    target: getP(flow, targetId),
    attack,
    attackRoll: roll,
    targetAC,
    hit,
    messages: flow.messages,
    battleId,
    currentRound: round,
    critFlavor,
    title: LABELS[label].title,
    rules: flow.ctx.rules,
  });

  appendHpChanges(battleAction, before, flow.ps);

  flow.ps = consumeAttackEffects(flow.ps, { attackerId, targetId, hit: isHit, existedBefore });

  return { battleAction, hit: isHit, downed: !isActive(getP(flow, targetId)) };
}
