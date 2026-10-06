import type { Rng } from "./types";

import type { Amount, Flat } from "@/lib/utils/abilities/schema";
import { evaluateFormula } from "@/lib/utils/battle/common/formula-evaluator";
import { rollDice } from "@/lib/utils/common/dice";
import type { BattleParticipant } from "@/types/battle";

export function formulaContext(p: BattleParticipant): Record<string, number> {
  const { maxHp, currentHp, morale } = p.combatStats;

  return {
    hero_level: p.abilities.level,
    lost_hp_percent: maxHp > 0 ? ((maxHp - currentHp) / maxHp) * 100 : 0,
    morale,
  };
}

export function resolveFlat(flat: Flat, owner: BattleParticipant): number {
  return typeof flat === "number" ? flat : Math.floor(evaluateFormula(flat.formula, formulaContext(owner)));
}

export function resolveAmount(
  amount: Amount,
  input: { owner: BattleParticipant; target?: BattleParticipant; eventDamage?: number; rng: Rng },
): number {
  if (typeof amount === "number") return amount;

  if (typeof amount === "string") return rollDice(amount, input.rng);

  if ("formula" in amount) return Math.max(0, Math.floor(evaluateFormula(amount.formula, formulaContext(input.owner))));

  const base =
    amount.percentOf === "eventDamage" ? (input.eventDamage ?? 0) : (input.target ?? input.owner).combatStats.maxHp;

  return Math.floor((base * amount.value) / 100);
}
