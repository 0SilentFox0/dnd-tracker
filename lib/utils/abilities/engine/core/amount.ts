import type { Rng } from "./types";

import { ownMorale } from "@/lib/utils/abilities/engine/effects/morale";
import type { Amount, Flat } from "@/lib/utils/abilities/schema";
import { evaluateFormula } from "@/lib/utils/battle/common/formula-evaluator";
import { averageAttackDamage } from "@/lib/utils/battle/damage/average";
import { rollDice } from "@/lib/utils/common/dice";
import type { BattleParticipant } from "@/types/battle";

export const FORMULA_VARIABLES = ["hero_level", "class_level", "str_mod", "dex_mod", "con_mod", "int_mod", "wis_mod", "cha_mod", "prof", "lost_hp_percent", "morale", "cells_moved"] as const;

function formulaContext(p: BattleParticipant): Record<(typeof FORMULA_VARIABLES)[number], number> {
  const { maxHp, currentHp } = p.combatStats;

  const m = p.abilities.modifiers;

  return {
    hero_level: p.abilities.level,
    // у вміннях класу class_level уже підставлено при збиранні (applyClassScale)
    class_level: p.abilities.level,
    str_mod: m.strength,
    dex_mod: m.dexterity,
    con_mod: m.constitution,
    int_mod: m.intelligence,
    wis_mod: m.wisdom,
    cha_mod: m.charisma,
    prof: p.abilities.proficiencyBonus ?? 0,
    lost_hp_percent: maxHp > 0 ? ((maxHp - currentHp) / maxHp) * 100 : 0,
    morale: ownMorale(p),
    cells_moved: p.battleData.movementUsed ?? 0,
  };
}

export function resolveFlat(flat: Flat, owner: BattleParticipant): number {
  if (typeof flat === "number") return flat;

  return "formula" in flat ? Math.floor(evaluateFormula(flat.formula, formulaContext(owner))) : 0;
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
  input: { owner: BattleParticipant; target?: BattleParticipant; eventDamage?: number; spellRoll?: number; rng: Rng; participants?: BattleParticipant[] },
): number {
  if (typeof amount === "number") return amount;

  if (typeof amount === "string") return rollDice(amount, input.rng);

  if ("scale" in amount) return 0;

  if ("formula" in amount) return Math.max(0, Math.floor(evaluateFormula(amount.formula, formulaContext(input.owner))));

  if ("spellRoll" in amount) {
    const percent = typeof amount.spellRoll === "number" ? amount.spellRoll : Math.max(0, Math.min(500, resolveFlat(amount.spellRoll, input.owner)));

    return Math.floor(((input.spellRoll ?? 0) * percent) / 100);
  }

  const base = percentBase(amount.percentOf, input);

  return Math.floor((base * amount.value) / 100);
}
