import type { AttackRollResult } from "../types/attack";
import { calculateAttackBonus, hasAdvantage, hasDisadvantage } from "./bonus";

import type { CriticalEffect } from "@/lib/constants/critical-effects";
import { getRandomCriticalEffect } from "@/lib/constants/critical-effects";
import { collectModifiers } from "@/lib/utils/abilities/engine/collect-modifiers";
import { withSelf } from "@/lib/utils/abilities/engine/participants";
import type { StaticEffect } from "@/lib/utils/abilities/schema";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

export function calculateAttackRoll(
  attacker: BattleParticipant,
  attack: BattleAttack,
  d20Roll: number,
  advantageRoll?: number,
  disadvantageRoll?: number,
  opts: { participants?: BattleParticipant[]; extra?: StaticEffect[]; targetId?: string; targetExtra?: StaticEffect[]; rng?: () => number } = {},
): AttackRollResult {
  const participants = withSelf(opts.participants ?? [], attacker);

  const attackBonus = calculateAttackBonus(attacker, attack, participants, opts.extra);

  const hasAdv = hasAdvantage(attacker, attack, participants, opts.extra, opts);

  const hasDisadv = hasDisadvantage(attacker, attack, participants, opts);

  const critThreshold = Math.max(2, 20 + collectModifiers(participants, attacker.basicInfo.id, { stat: "critThreshold" }, opts.extra).flat);

  let finalRoll = d20Roll;

  let advantageUsed = false;

  let secondRoll: AttackRollResult["secondRoll"];

  const rollSecond = () => Math.floor((opts.rng ?? Math.random)() * 20) + 1;

  if (hasAdv && !hasDisadv) {
    const value = advantageRoll ?? rollSecond();

    secondRoll = { mode: "advantage", value, serverRolled: advantageRoll === undefined };
    finalRoll = Math.max(d20Roll, value);
    advantageUsed = true;
  } else if (hasDisadv && !hasAdv) {
    const value = disadvantageRoll ?? rollSecond();

    secondRoll = { mode: "disadvantage", value, serverRolled: disadvantageRoll === undefined };
    finalRoll = Math.min(d20Roll, value);
  }

  const totalAttackValue = finalRoll + attackBonus;

  const isCritical = finalRoll >= critThreshold;

  const isCriticalFail = finalRoll === 1;

  const isHit = !isCriticalFail;

  let criticalEffect: CriticalEffect | undefined;

  if (isCritical) {
    criticalEffect = getRandomCriticalEffect("success", opts.rng);
  } else if (isCriticalFail) {
    criticalEffect = getRandomCriticalEffect("fail", opts.rng);
  }

  return {
    isHit,
    isCritical,
    isCriticalFail,
    totalAttackValue,
    attackBonus,
    criticalEffect,
    advantageUsed,
    ...(secondRoll && { secondRoll }),
  };
}
