import { SPELL_DAMAGE_KEY } from "./resist";

import { ARMOR_FACTOR_MAX, ARMOR_FACTOR_MIN, DEFENSE_FACTOR_MAX, REF_HERO_HIT, REF_UNIT_HIT } from "@/lib/constants/battle-balance";

/** d20 + bonus ≥ AC; natural 1 always misses, natural 20 always hits. */
export function hitChance(attackBonus: number, ac: number): number {
  return Math.min(0.95, Math.max(0.05, (21 - (ac - attackBonus)) / 20));
}

const clamp = (x: number, max: number) => Math.min(max, Math.max(ARMOR_FACTOR_MIN, x));

export interface ArmorFactors {
  hp: number;
  dpr: number;
}

export interface FactorUnit {
  ac?: number;
  attackBonus?: number;
  resist?: Record<string, number>;
}

export interface FactorParty {
  toHit?: number;
  ac?: number;
  weaponShare?: number;
  damageProfile?: Record<string, number>;
}

const taken = (resist: Record<string, number> | undefined, key: string) => 1 - (resist?.[key] ?? 0) / 100;

/** Share of the party's damage that lands on the unit relative to an average matchup: weapons feel AC and their damage type/kind, spells only `spell` resistance. */
function landedDamage(unit: FactorUnit, party: FactorParty): number | null {
  const hit = unit.ac !== undefined && party.toHit !== undefined ? hitChance(party.toHit, unit.ac) / REF_HERO_HIT : null;

  const resist = unit.resist && Object.keys(unit.resist).length > 0 ? unit.resist : undefined;

  if (hit === null && !resist) return null;

  const weaponShare = party.weaponShare ?? 1;

  let weapon = weaponShare;

  if (resist && party.damageProfile) {
    let profiled = 0;

    weapon = 0;

    for (const [key, share] of Object.entries(party.damageProfile)) {
      profiled += share;
      weapon += share * taken(resist, key);
    }

    weapon += Math.max(0, weaponShare - profiled);
  }

  return weapon * (hit ?? 1) + (1 - weaponShare) * taken(resist, SPELL_DAMAGE_KEY);
}

/** How much tougher (hp) and deadlier (dpr) a unit is against this party than in an average matchup; 1 when a number is missing. */
export function armorFactors(unit: FactorUnit, party: FactorParty): ArmorFactors {
  const landed = landedDamage(unit, party);

  const hp = landed === null ? 1 : landed <= 0 ? DEFENSE_FACTOR_MAX : clamp(1 / landed, DEFENSE_FACTOR_MAX);

  const dpr = unit.attackBonus !== undefined && party.ac !== undefined ? clamp(hitChance(unit.attackBonus, party.ac) / REF_UNIT_HIT, ARMOR_FACTOR_MAX) : 1;

  return { hp, dpr };
}
