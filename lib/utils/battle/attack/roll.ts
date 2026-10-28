import type { AttackRollResult } from "../types/attack";
import { calculateAttackBonus, forcedRollMode, type RollMode, rollModeReasons } from "./bonus";

import type { CriticalEffect } from "@/lib/constants/critical-effects";
import { getRandomCriticalEffect } from "@/lib/constants/critical-effects";
import { collectModifiers } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { withSelf } from "@/lib/utils/abilities/engine/core/participants";
import type { StaticEffect } from "@/lib/utils/abilities/schema";
import type { CritPicker } from "@/lib/utils/battle/crit-choice/types";
import { rollDie } from "@/lib/utils/common/dice";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

export function calculateAttackRoll(
  attacker: BattleParticipant,
  attack: BattleAttack,
  d20Roll: number,
  advantageRoll?: number,
  disadvantageRoll?: number,
  opts: { participants?: BattleParticipant[]; extra?: StaticEffect[]; targetId?: string; targetExtra?: StaticEffect[]; rng?: () => number; manualMode?: RollMode; crit?: CritPicker } = {},
): AttackRollResult {
  const participants = withSelf(opts.participants ?? [], attacker);

  const attackBonus = calculateAttackBonus(attacker, attack, participants, opts.extra);

  const forced = forcedRollMode(rollModeReasons(attacker, attack, participants, opts));

  // вибір гравця діє лише тоді, коли навички нічого не вирішують
  const mode = forced.forced ? forced.mode : (opts.manualMode ?? "normal");

  const manual = !forced.forced && mode !== "normal";

  const critThreshold = Math.max(2, 20 + collectModifiers(participants, attacker.basicInfo.id, { stat: "critThreshold" }, opts.extra).flat);

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

  const isCritical = finalRoll >= critThreshold;

  const isCriticalFail = finalRoll === 1;

  const isHit = !isCriticalFail;

  let criticalEffect: CriticalEffect | undefined;

  if (isCritical) {
    criticalEffect = opts.crit ? opts.crit({ source: "attack", kind: "success", actorId: attacker.basicInfo.id, targetId: opts.targetId ?? "" }) : getRandomCriticalEffect("success", opts.rng);
  } else if (isCriticalFail) {
    criticalEffect = opts.crit ? opts.crit({ source: "attack", kind: "fail", actorId: attacker.basicInfo.id, targetId: opts.targetId ?? "" }) : getRandomCriticalEffect("fail", opts.rng);
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
