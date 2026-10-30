import type { AbilityKey } from "@/lib/constants/abilities";
import { AttackType } from "@/lib/constants/battle";
import { attackAbilityKey, getAttackAbilityModifier } from "@/lib/utils/common/calculations";
import { diceAverage } from "@/lib/utils/common/dice";

export interface UnitDamageSummary {
  average: number;
  dice: string;
  mod: number;
  ability: AbilityKey;
}

type Scores = { strength: number; dexterity: number; primaryAbility?: AbilityKey | null };

/** Same arithmetic as the engine's hit: dice + the attack's ability modifier. */
export function unitDamageSummary(scores: Scores, attacks: ReadonlyArray<{ damageDice?: string; type?: string }>): UnitDamageSummary | null {
  let best: { avg: number; dice: string; mod: number; type: string } | null = null;

  for (const a of attacks) {
    const type = a.type ?? AttackType.MELEE;

    const dice = a.damageDice || "1d6";

    const mod = getAttackAbilityModifier(scores, type);

    const avg = diceAverage(dice) + mod;

    if (!best || avg > best.avg) best = { avg, dice, mod, type };
  }

  if (!best) return null;

  return { average: Math.round(best.avg), dice: best.dice, mod: best.mod, ability: attackAbilityKey(scores, best.type) };
}
