import { getEffectiveArmorClass } from "../participant";
import type { AttackRollResult } from "../types/attack";
import { appendHpChanges, type AttackFlow, getP, put } from "./process/ability-flow";
import { buildRetaliationAction, type BuildRetaliationParams } from "./process/actions";
import { resolveHit } from "./process/hit";
import { activeEffectIds, consumeAttackEffects } from "./consume-effects";
import { applyCriticalEffect } from "./critical";
import { getDisabledAttackKinds } from "./disabled-attacks";
import { calculateAttackRoll } from "./roll";

import { AttackType } from "@/lib/constants/battle";
import type { CriticalEffect } from "@/lib/constants/critical-effects";
import { findFlags } from "@/lib/utils/abilities/engine/collect-modifiers";
import { findParticipant, isActive, withSelf } from "@/lib/utils/abilities/engine/participants";
import type { Rng } from "@/lib/utils/abilities/engine/types";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import { heroAttackDamageParts } from "@/lib/utils/battle/damage/hero-damage";
import { parseDiceLenient, rollGroups } from "@/lib/utils/common/dice";
import type { BattleAction, BattleAttack, BattleParticipant } from "@/types/battle";

type Kind = AttackType;

const kindOf = (a: Pick<BattleAttack, "type">): Kind => attackKindOf(a.type);

const rollD20 = (rng: Rng) => 1 + Math.floor(rng() * 20);

export interface RetaliationInput {
  participants: BattleParticipant[];
  attackerId: string;
  defenderId: string;
  attack: BattleAttack;
  attackRoll: Pick<AttackRollResult, "isCriticalFail">;
  criticalEffect?: CriticalEffect;
  provoked?: boolean;
  round: number;
  battleId: string;
  rng: Rng;
}

export interface RetaliationResult {
  participants: BattleParticipant[];
  battleAction: BattleAction;
}

function weaponFor(defender: BattleParticipant, participants: BattleParticipant[], kind: Kind): { attack: BattleAttack; bonusPercent: number } | null {
  const flags = findFlags(withSelf(participants, defender), defender.basicInfo.id, "counterAttack");

  if (kind === AttackType.RANGED && !flags.some((f) => f.attackKinds.includes(AttackType.RANGED))) return null;

  if (getDisabledAttackKinds(defender)[kind]) return null;

  const attack = defender.battleData.attacks.find((a) => kindOf(a) === kind);

  return attack ? { attack, bonusPercent: flags.reduce((sum, f) => sum + f.bonusPercent, 0) } : null;
}

/** Відсіч основної цілі: без дії, без тригерів «перед/після атаки», без нових відсічей. */
export function resolveRetaliation(input: RetaliationInput): RetaliationResult | null {
  const { participants, attackerId, defenderId, round, battleId, rng } = input;

  const { provoked } = input;

  if ((!provoked && input.attackRoll.isCriticalFail) || input.criticalEffect?.effect.type === "ignore_reactions") return null;

  const defender = findParticipant(participants, defenderId);

  const attacker = findParticipant(participants, attackerId);

  if (!defender || !attacker || !isActive(defender) || !isActive(attacker)) return null;

  if (provoked ? defender.battleData.activeEffects.some((e) => e.effects.some((d) => d.type === "no_reaction")) : defender.actionFlags.hasUsedReaction) return null;

  const weapon = weaponFor(defender, participants, kindOf(input.attack));

  if (!weapon) return null;

  const existedBefore = activeEffectIds(participants);

  const flow: AttackFlow = { ps: participants, messages: [], ctx: { round, rng } };

  if (!provoked) put(flow, { ...defender, actionFlags: { ...defender.actionFlags, hasUsedReaction: true } });

  const first = rollD20(rng);

  const second = rollD20(rng);

  const roll = calculateAttackRoll(getP(flow, defenderId), weapon.attack, first, second, second, { participants: flow.ps, targetId: attackerId, rng });

  if (roll.secondRoll) flow.messages.push(`🎲 відсіч, ${roll.secondRoll.mode === "advantage" ? "перевага" : "недолік"}: другий d20 = ${roll.secondRoll.value}`);

  if (roll.isCriticalFail && roll.criticalEffect) put(flow, applyCriticalEffect(getP(flow, defenderId), roll.criticalEffect, round, undefined, { offTurn: true }));

  const targetAC = getEffectiveArmorClass(getP(flow, attackerId), flow.ps);

  const guaranteedHit = findFlags(flow.ps, defenderId, "guaranteedHit").length > 0;

  const isHit = !roll.isCriticalFail && (roll.isCritical || guaranteedHit || roll.totalAttackValue >= targetAC);

  let hit: BuildRetaliationParams["hit"] = null;

  if (isHit) {
    const damageRolls = rollGroups(parseDiceLenient(heroAttackDamageParts(getP(flow, defenderId), weapon.attack).formula).groups, rng);

    const { hitDamage } = resolveHit({
      flow,
      attackerId: defenderId,
      targetId: attackerId,
      attack: weapon.attack,
      damageRolls,
      attackRoll: roll,
      currentRound: round,
      bonusPercent: weapon.bonusPercent,
      offTurn: true,
    });

    hit = { damageRolls, hitDamage };
  }

  const battleAction = buildRetaliationAction({
    retaliator: getP(flow, defenderId),
    target: getP(flow, attackerId),
    attack: weapon.attack,
    attackRoll: roll,
    targetAC,
    hit,
    messages: flow.messages,
    battleId,
    currentRound: round,
  });

  appendHpChanges(battleAction, participants, flow.ps);

  return { participants: consumeAttackEffects(flow.ps, { attackerId: defenderId, targetId: attackerId, hit: isHit, existedBefore }), battleAction };
}
