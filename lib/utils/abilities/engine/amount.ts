import { ownMorale } from "./morale";
import type { Rng } from "./types";

import type { Amount, Flat } from "@/lib/utils/abilities/schema";
import { evaluateFormula } from "@/lib/utils/battle/common/formula-evaluator";
import { averageAttackDamage } from "@/lib/utils/battle/damage/average";
import { rollDice } from "@/lib/utils/common/dice";
import type { BattleParticipant } from "@/types/battle";

export function formulaContext(p: BattleParticipant): Record<string, number> {
  const { maxHp, currentHp } = p.combatStats;

  return {
    hero_level: p.abilities.level,
    lost_hp_percent: maxHp > 0 ? ((maxHp - currentHp) / maxHp) * 100 : 0,
    morale: ownMorale(p),
  };
}

export function resolveFlat(flat: Flat, owner: BattleParticipant): number {
  return typeof flat === "number" ? flat : Math.floor(evaluateFormula(flat.formula, formulaContext(owner)));
}

function percentBase(
  of: "eventDamage" | "maxHp" | "ownerAttack",
  input: { owner: BattleParticipant; target?: BattleParticipant; eventDamage?: number; participants?: BattleParticipant[] },
): number {
  if (of === "eventDamage") return input.eventDamage ?? 0;

  if (of === "maxHp") return (input.target ?? input.owner).combatStats.maxHp;

  const attack = input.owner.battleData.attacks?.[0];

  return attack ? averageAttackDamage(input.owner, attack, input.participants ?? [input.owner]).total : 0;
}

export function resolveAmount(
  amount: Amount,
  input: { owner: BattleParticipant; target?: BattleParticipant; eventDamage?: number; rng: Rng; participants?: BattleParticipant[] },
): number {
  if (typeof amount === "number") return amount;

  if (typeof amount === "string") return rollDice(amount, input.rng);

  if ("formula" in amount) return Math.max(0, Math.floor(evaluateFormula(amount.formula, formulaContext(input.owner))));

  const base = percentBase(amount.percentOf, input);

  return Math.floor((base * amount.value) / 100);
}
