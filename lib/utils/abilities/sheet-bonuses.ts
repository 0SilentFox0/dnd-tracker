import type { Ability, StatKey } from "./schema";

export type SheetStatKey =
  | "strength"
  | "dexterity"
  | "constitution"
  | "intelligence"
  | "wisdom"
  | "charisma"
  | "armorClass"
  | "speed"
  | "initiative"
  | "morale"
  | "minTargets"
  | "maxTargets";

export interface SheetStatBonuses {
  stats: Partial<Record<SheetStatKey, number>>;
  spellSlotBonusByLevel: Record<string, number>;
}

const STAT_TO_SHEET: Partial<Record<StatKey, SheetStatKey>> = {
  strength: "strength",
  dexterity: "dexterity",
  constitution: "constitution",
  intelligence: "intelligence",
  wisdom: "wisdom",
  charisma: "charisma",
  armor: "armorClass",
  speed: "speed",
  initiative: "initiative",
  morale: "morale",
  minTargets: "minTargets",
  maxTargets: "maxTargets",
};

const unconditionalPassives = (abilities: Ability[]) => abilities.filter((a) => a.trigger.event === "passive" && !a.condition);

/** Flat, unconditional, self-only stat bonuses — what the character sheet can show without a battle. */
export function sheetStatBonuses(abilities: Ability[]): SheetStatBonuses {
  const out: SheetStatBonuses = { stats: {}, spellSlotBonusByLevel: {} };

  for (const a of unconditionalPassives(abilities)) {
    for (const e of a.effects) {
      if (e.kind !== "modifyStat" || typeof e.flat !== "number" || e.flat === 0) continue;

      if (e.target && e.target !== "self") continue;

      if (e.stat === "spellSlots") {
        for (const lvl of e.spellLevels ?? []) out.spellSlotBonusByLevel[lvl] = (out.spellSlotBonusByLevel[lvl] ?? 0) + e.flat;

        continue;
      }

      const key = STAT_TO_SHEET[e.stat];

      if (key) out.stats[key] = (out.stats[key] ?? 0) + e.flat;
    }
  }

  for (const [k, v] of Object.entries(out.stats)) if (v === 0) delete out.stats[k as SheetStatKey];

  return out;
}

export type DamageAffinityType = "melee" | "ranged" | "magic";

export function damageAffinity(abilities: Ability[]): { affectsDamage: boolean; damageType: DamageAffinityType | null } {
  const kinds = new Set<string>();

  for (const a of unconditionalPassives(abilities)) {
    for (const e of a.effects) if (e.kind === "damageBonus") kinds.add(e.filter.kind);
  }

  if (kinds.size === 0) return { affectsDamage: false, damageType: null };

  const [only] = [...kinds];

  return { affectsDamage: true, damageType: kinds.size === 1 && (only === "melee" || only === "ranged" || only === "magic") ? only : null };
}
