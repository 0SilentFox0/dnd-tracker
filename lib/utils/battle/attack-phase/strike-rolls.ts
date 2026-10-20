import type { AttackRequest, ValidatedAttackRequest } from "./request";

import type { Rng } from "@/lib/utils/abilities/engine/core/types";
import { BattleRuleError } from "@/lib/utils/battle/store/errors";
import { diceCount, rollDiceList, rollDie } from "@/lib/utils/common/dice";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

// multi-target ranged: основна ціль — повна шкода, додаткові — за falloff; інакше — damageDistribution або порівну
export function damageFractions(targets: BattleParticipant[], attack: BattleAttack, multi: { isMultiTargetRanged: boolean; falloff: number }): number[] {
  if (multi.isMultiTargetRanged) return targets.map((_, i) => (i === 0 ? 1 : multi.falloff));

  const even = () => targets.map(() => 1 / targets.length);

  const dist = attack.damageDistribution;

  if (!dist || dist.length !== targets.length || !dist.every((n) => typeof n === "number" && n >= 0 && n <= 100)) return even();

  const sum = dist.reduce((a, b) => a + b, 0);

  return sum > 0 ? dist.map((p) => p / sum) : even();
}

export function strikeD20(
  data: AttackRequest,
  request: Pick<ValidatedAttackRequest, "singleRoll" | "usePerTargetRolls">,
  strike: { index: number; chosenAt: number; expanded: boolean },
  rng: Rng,
): number {
  const { singleRoll, usePerTargetRolls } = request;

  const d20 = strike.expanded
    ? ((usePerTargetRolls && strike.chosenAt >= 0 ? data.attackRolls?.[strike.chosenAt] : singleRoll) ?? rollDie(20, rng))
    : usePerTargetRolls && data.attackRolls
      ? data.attackRolls[strike.index]
      : singleRoll;

  if (d20 == null || d20 < 1 || d20 > 20) {
    throw new BattleRuleError("action_rejected", `Некоректний кидок атаки для цілі ${strike.index + 1}`);
  }

  return d20;
}

export interface StrikeDice {
  rolls: number[];
  /** Кубики, яких клієнт не надіслав і які докинув сервер; null — сервер нічого не кидав */
  serverRolled: number[] | null;
}

// кожне влучання мультицільової атаки бере свій блок кубиків повної формули, по черзі влучань
export function damageDiceCursor(sent: number[], formula: string | null, rng: Rng) {
  const perStrike = formula ? diceCount(formula) : 0;

  let cursor = 0;

  return {
    next(): StrikeDice {
      if (!formula || perStrike === 0) return { rolls: sent, serverRolled: null };

      const own = sent.slice(cursor, cursor + perStrike);

      if (own.length >= perStrike) return { rolls: own, serverRolled: null };

      const extra = rollDiceList(formula, rng).slice(own.length);

      return { rolls: [...own, ...extra], serverRolled: extra };
    },
    hit() {
      cursor += perStrike;
    },
  };
}
