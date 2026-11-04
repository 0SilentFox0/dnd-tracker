import { skillTarget, value } from "../characteristics/derive";
import { readCharacteristics } from "../characteristics/keys";
import { type PercentileTestResult, resolvePercentileTest } from "../percentile";
import { DIFFICULTY_SL } from "../percentile/difficulty";
import { MOMENTUM_SL_BONUS, OUTNUMBERING_BONUS } from "./constants";
import { hitLocation } from "./location";
import { resolveOpposed } from "./opposed";

import { AttackType } from "@/lib/constants/battle";
import { isActive } from "@/lib/utils/abilities/engine/core/participants";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import { isAdjacent } from "@/lib/utils/battle/grid/occupancy";
import type { PercentileAttackDetails } from "@/lib/utils/battle/types/attack";
import type { ResolveAttackCtx,ResolvedAttack } from "@/lib/utils/rules/systems/types";
import type { BattleParticipant } from "@/types/battle";

const charsOf = (p: BattleParticipant) => readCharacteristics({ characteristics: p.abilities.characteristics });

// Positions are required: without a map nobody counts as outnumbering.
function isOutnumbering(attacker: BattleParticipant, target: BattleParticipant, participants: BattleParticipant[]): boolean {
  const near = (of: BattleParticipant, side: BattleParticipant["basicInfo"]["side"]) =>
    participants.filter((p) => p.basicInfo.side === side && isActive(p) && (p.basicInfo.id === of.basicInfo.id || isAdjacent(p, of))).length;

  if (!isAdjacent(attacker, target)) return false;

  return near(target, attacker.basicInfo.side) >= 2 * near(attacker, target.basicInfo.side);
}

function toResult(details: PercentileAttackDetails, isHit: boolean, momentum: ResolvedAttack["momentum"]): ResolvedAttack {
  return {
    isHit,
    netSl: details.netSl,
    location: details.location,
    momentum,
    attackRoll: {
      isHit,
      isCritical: details.doubles && isHit,
      isCriticalFail: false,
      totalAttackValue: details.roll,
      attackBonus: 0,
      advantageUsed: false,
      chosenD20: details.roll,
      percentile: details,
    },
  };
}

const detailsOf = (t: PercentileTestResult, netSl: number, extra: Partial<PercentileAttackDetails> = {}): PercentileAttackDetails => ({
  roll: t.roll,
  target: t.target,
  sl: t.sl,
  netSl,
  location: hitLocation(t.rawRoll),
  doubles: t.doubles,
  ...extra,
});

export function resolveWfrpAttack(ctx: ResolveAttackCtx): ResolvedAttack {
  const { attacker, target, attack, participants, rng, manualRoll } = ctx;

  const a = charsOf(attacker);

  if (attackKindOf(attack.type) === AttackType.RANGED) {
    const test = resolvePercentileTest({ target: value(a, "bs"), slModifier: DIFFICULTY_SL.challenging, doubles: true, rng, presetRoll: manualRoll });

    const isHit = test.outcome === "success" || test.outcome === "critical";

    return toResult(detailsOf(test, test.sl), isHit, { spent: false, gainedBy: null });
  }

  const d = charsOf(target);

  const dodge = skillTarget(d, "dodge")?.target ?? value(d, "ag");

  const spent = ctx.momentum.attacker;

  const result = resolveOpposed({
    attackerTarget: value(a, "ws") + (isOutnumbering(attacker, target, participants) ? OUTNUMBERING_BONUS : 0),
    defenderTargets: [
      { kind: "parry", target: value(d, "ws") },
      { kind: "dodge", target: dodge },
    ],
    attackerSlMod: spent ? MOMENTUM_SL_BONUS : 0,
    defenderSlMod: ctx.momentum.defender ? MOMENTUM_SL_BONUS : 0,
    rng,
    presetRolls: { attacker: manualRoll },
  });

  const details = detailsOf(result.attacker, result.netSl, {
    defender: { kind: result.defender.kind, roll: result.defender.roll, sl: result.defender.sl, target: result.defender.target },
    ...(spent && { momentumUsed: true }),
  });

  return toResult(details, result.isHit, { spent, gainedBy: result.attackerWon ? "attacker" : "defender" });
}
