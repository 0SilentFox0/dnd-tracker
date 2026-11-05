import { ownMorale } from "@/lib/utils/abilities/engine/effects/morale";
import type { Flat } from "@/lib/utils/abilities/schema";
import { evaluateFormula } from "@/lib/utils/battle/common/formula-evaluator";
import type { BattleParticipant } from "@/types/battle";

export const FORMULA_VARIABLES = ["hero_level", "class_level", "str_mod", "dex_mod", "con_mod", "int_mod", "wis_mod", "cha_mod", "prof", "lost_hp_percent", "morale", "cells_moved"] as const;

export function formulaContext(p: BattleParticipant): Record<(typeof FORMULA_VARIABLES)[number], number> {
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

export function resolveFlat(flat: Flat | { spellRoll: number }, owner: BattleParticipant): number {
  if (typeof flat === "number") return flat;

  return "formula" in flat ? Math.floor(evaluateFormula(flat.formula, formulaContext(owner))) : 0;
}
