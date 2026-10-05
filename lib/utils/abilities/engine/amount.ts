import type { Rng } from "./types";

import { type Amount, DICE_RE, type Flat } from "@/lib/utils/abilities/schema";
import { evaluateFormula } from "@/lib/utils/battle/common/formula-evaluator";
import type { BattleParticipant } from "@/types/battle";

export function rollDice(notation: string, rng: Rng): number {
  const m = DICE_RE.exec(notation);

  if (!m) return 0;

  let total = Number(m[3] ?? 0);

  for (let i = 0; i < Number(m[1]); i++) total += 1 + Math.floor(rng() * Number(m[2]));

  return Math.max(0, total);
}

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
