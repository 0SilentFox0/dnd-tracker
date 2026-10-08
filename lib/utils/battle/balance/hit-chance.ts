import { ARMOR_FACTOR_MAX, ARMOR_FACTOR_MIN, REF_HERO_HIT, REF_UNIT_HIT } from "@/lib/constants/battle-balance";

/** d20 + bonus ≥ AC; natural 1 always misses, natural 20 always hits. */
export function hitChance(attackBonus: number, ac: number): number {
  return Math.min(0.95, Math.max(0.05, (21 - (ac - attackBonus)) / 20));
}

const clampFactor = (x: number) => Math.min(ARMOR_FACTOR_MAX, Math.max(ARMOR_FACTOR_MIN, x));

export interface ArmorFactors {
  hp: number;
  dpr: number;
}

/** How much tougher (hp) and deadlier (dpr) a unit is against this party than in an average matchup; 1 when a number is missing. Spells ignore AC, so only the party's weapon share of damage feels the unit's AC. */
export function armorFactors(unit: { ac?: number; attackBonus?: number }, party: { toHit?: number; ac?: number; weaponShare?: number }): ArmorFactors {
  const share = party.weaponShare ?? 1;

  const hp = unit.ac !== undefined && party.toHit !== undefined ? 1 + share * (clampFactor(REF_HERO_HIT / hitChance(party.toHit, unit.ac)) - 1) : 1;

  const dpr = unit.attackBonus !== undefined && party.ac !== undefined ? clampFactor(hitChance(unit.attackBonus, party.ac) / REF_UNIT_HIT) : 1;

  return { hp, dpr };
}
