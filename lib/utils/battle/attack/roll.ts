import type { AttackRollResult } from "../types/attack";
import { calculateAttackBonus, forcedRollMode, type RollMode, rollModeReasons } from "./bonus";

import type { CriticalEffect } from "@/lib/constants/critical-effects";
import { getRandomCriticalEffect } from "@/lib/constants/critical-effects";
import { withSelf } from "@/lib/utils/abilities/engine/core/participants";
import type { StaticEffect } from "@/lib/utils/abilities/schema";
import { critThresholdOf } from "@/lib/utils/battle/attack/crit-threshold";
import type { CritPicker } from "@/lib/utils/battle/crit-choice/types";
import { rollDie } from "@/lib/utils/common/dice";
import { DEFAULT_RULES, type Ruleset } from "@/lib/utils/rules";
import type { BattleAttack, BattleMapConfig, BattleParticipant } from "@/types/battle";

export function calculateAttackRoll(
  attacker: BattleParticipant,
  attack: BattleAttack,
  d20Roll: number,
  advantageRoll?: number,
  disadvantageRoll?: number,
  opts: { participants?: BattleParticipant[]; extra?: StaticEffect[]; targetId?: string; targetExtra?: StaticEffect[]; rng?: () => number; manualMode?: RollMode; rules?: Ruleset; map?: BattleMapConfig | null; inspiration?: boolean; crit?: CritPicker } = {},
): AttackRollResult {
  const c = (opts.rules ?? DEFAULT_RULES).criticals;

  const participants = withSelf(opts.participants ?? [], attacker);

  const attackBonus = calculateAttackBonus(attacker, attack, participants, opts.extra);

  const forced = forcedRollMode(rollModeReasons(attacker, attack, participants, opts));

  // вибір гравця діє лише тоді, коли навички нічого не вирішують
  const mode = forced.forced ? forced.mode : (opts.manualMode ?? "normal");

  const manual = !forced.forced && mode !== "normal";

  const critThreshold = critThresholdOf(opts.rules, participants, attacker.basicInfo.id, opts.extra);

  let finalRoll = d20Roll;

  let advantageUsed = false;

  let secondRoll: AttackRollResult["secondRoll"];

  const rollSecond = () => rollDie(20, opts.rng);

  if (mode === "advantage") {
    const value = advantageRoll ?? rollSecond();

    secondRoll = { mode: "advantage", value, serverRolled: advantageRoll === undefined, ...(manual && { manual }) };
    finalRoll = Math.max(d20Roll, value);
    advantageUsed = true;
  } else if (mode === "disadvantage") {
    const value = disadvantageRoll ?? rollSecond();

    secondRoll = { mode: "disadvantage", value, serverRolled: disadvantageRoll === undefined, ...(manual && { manual }) };
    finalRoll = Math.min(d20Roll, value);
  }

  const totalAttackValue = finalRoll + attackBonus;

  const isCriticalFail = c.fumbleOn > 0 && finalRoll <= c.fumbleOn;

  const isCritical = !isCriticalFail && finalRoll >= critThreshold;

  const isHit = !isCriticalFail;

  let criticalEffect: CriticalEffect | undefined;

  if (c.effects && isCritical) {
    criticalEffect = opts.crit ? opts.crit({ source: "attack", kind: "success", actorId: attacker.basicInfo.id, targetId: opts.targetId ?? "" }) : getRandomCriticalEffect("success", opts.rng, c.disabledSuccess);
  } else if (c.effects && isCriticalFail) {
    criticalEffect = opts.crit ? opts.crit({ source: "attack", kind: "fail", actorId: attacker.basicInfo.id, targetId: opts.targetId ?? "" }) : getRandomCriticalEffect("fail", opts.rng, c.disabledFail);
  }

  return {
    isHit,
    isCritical,
    isCriticalFail,
    totalAttackValue,
    attackBonus,
    criticalEffect,
    advantageUsed,
    chosenD20: finalRoll,
    ...(secondRoll && { secondRoll }),
  };
}

/** Режим кидка для подій hit / attack after: лише перевага чи недолік, звичайний — без поля. */
export function eventRollMode(roll: AttackRollResult): { rollMode?: "advantage" | "disadvantage" } {
  return roll.secondRoll ? { rollMode: roll.secondRoll.mode } : {};
}
