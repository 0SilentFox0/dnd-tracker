import { buildRetaliationAction, type BuildRetaliationParams } from "./process/actions";
import { resolveHit } from "./process/hit";
import { activeEffectIds, consumeAttackEffects } from "./consume-effects";
import { applyCriticalEffect, critFlavorFor } from "./critical";
import { getDisabledAttackKinds } from "./disabled-attacks";
import { calculateAttackRoll } from "./roll";

import { AttackType } from "@/lib/constants/battle";
import type { CriticalEffect } from "@/lib/constants/critical-effects";
import { findFlags, findFlagsMany } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { findParticipant, isActive, withSelf } from "@/lib/utils/abilities/engine/core/participants";
import type { Rng } from "@/lib/utils/abilities/engine/core/types";
import { type ActionFlow, appendHpChanges, getP, put } from "@/lib/utils/battle/common/action-flow";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import type { CritPicker } from "@/lib/utils/battle/crit-choice/types";
import { heroAttackDamageParts } from "@/lib/utils/battle/damage/hero-damage";
import { getEffectiveArmorClass } from "@/lib/utils/battle/participant";
import { hasEffectMarker } from "@/lib/utils/battle/participant/state";
import type { AttackRollResult } from "@/lib/utils/battle/types/attack";
import { parseDiceLenient, rollDie, rollGroups } from "@/lib/utils/common/dice";
import type { BattleAction, BattleAttack, BattleMapConfig, BattleParticipant } from "@/types/battle";

type Kind = AttackType;

const kindOf = (a: Pick<BattleAttack, "type">): Kind => attackKindOf(a.type);

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
  crit?: CritPicker;
  map?: BattleMapConfig | null;
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

  if (findFlags(withSelf(participants, attacker), attackerId, "noRetaliation").length > 0) return null;

  const defenderFlags = findFlagsMany(withSelf(participants, defender), defenderId, ["unlimitedRetaliation", "extraRetaliations"]);

  const unlimited = defenderFlags.unlimitedRetaliation.length > 0;

  const allowed = 1 + defenderFlags.extraRetaliations.reduce((n, f) => n + f.count, 0);

  const used = defender.battleData.retaliationsUsed ?? (defender.actionFlags.hasUsedReaction ? 1 : 0);

  if (provoked ? hasEffectMarker(defender, "no_reaction") : !unlimited && (defender.actionFlags.hasUsedReaction || used >= allowed)) return null;

  const weapon = weaponFor(defender, participants, kindOf(input.attack));

  if (!weapon) return null;

  const existedBefore = activeEffectIds(participants);

  const flow: ActionFlow = { ps: participants, messages: [], summons: [], ctx: { round, rng, map: input.map, crit: input.crit } };

  if (!provoked && !unlimited) {
    put(flow, {
      ...defender,
      battleData: { ...defender.battleData, retaliationsUsed: used + 1 },
      actionFlags: { ...defender.actionFlags, hasUsedReaction: used + 1 >= allowed },
    });
  }

  const first = rollDie(20, rng);

  const second = rollDie(20, rng);

  const roll = calculateAttackRoll(getP(flow, defenderId), weapon.attack, first, second, second, { participants: flow.ps, targetId: attackerId, rng, crit: flow.ctx.crit });

  if (roll.secondRoll) flow.messages.push(`🎲 відсіч, ${roll.secondRoll.mode === "advantage" ? "перевага" : "недолік"}: другий d20 = ${roll.secondRoll.value}`);

  if (roll.isCriticalFail && roll.criticalEffect) put(flow, applyCriticalEffect(getP(flow, defenderId), roll.criticalEffect, round, { offTurn: true }));

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
      battleId,
      bonusPercent: weapon.bonusPercent,
      offTurn: true,
    });

    hit = { damageRolls, hitDamage };
  }

  const retaliationCrit = roll.isCriticalFail ? roll.criticalEffect : hit?.hitDamage.criticalEffectApplied;

  const critFlavorText = retaliationCrit
    ? critFlavorFor(retaliationCrit, getP(flow, defenderId).basicInfo.name, getP(flow, attackerId).basicInfo.name, {
        battleId,
        round,
        attackerId: defenderId,
        targetId: attackerId,
        suffix: "r",
      })
    : undefined;

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
    critFlavorText,
  });

  appendHpChanges(battleAction, participants, flow.ps);

  return { participants: consumeAttackEffects(flow.ps, { attackerId: defenderId, targetId: attackerId, hit: isHit, existedBefore }), battleAction };
}
