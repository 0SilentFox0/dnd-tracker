import type { AbilityCore } from "../lib/abilities";

import type { Choice } from "@/types/choices";

export interface FeatMechanics {
  /** "note" — a note carrying the full feat text; absent means note only */
  abilities?: Array<{ id: string; name: string; core: AbilityCore } | "note">;
  choices?: Choice[];
}

const asi = (points: number, max: number, abilities?: Choice["abilities"]): Choice => ({ id: "ability-score-increase", label: "Ability Score Increase", level: 1, count: 1, kind: "abilityScore", points, max, ...(abilities && { abilities }) });

const MI_LISTS = ["Cleric", "Druid", "Wizard"];

const boon: FeatMechanics = { abilities: ["note"], choices: [asi(1, 30)] };

export const FEAT_MECHANICS: Record<string, FeatMechanics> = {
  "srd-2024_alert": {
    abilities: [{ id: "initiative-proficiency", name: "Initiative Proficiency", core: { trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "initiative", flat: { formula: "prof" } }] } }, "note"],
  },
  "srd-2024_magic-initiate": {
    abilities: ["note"],
    choices: [
      { id: "cantrips", label: "Two Cantrips", level: 1, count: 2, kind: "spell", spells: { lists: MI_LISTS, minLevel: 0, maxLevel: 0 } },
      { id: "level-one-spell", label: "Level One Spell", level: 1, count: 1, kind: "spell", spells: { lists: MI_LISTS, minLevel: 1, maxLevel: 1 } },
    ],
  },
  "srd-2024_skilled": { abilities: [], choices: [{ id: "skills", label: "Skills", level: 1, count: 3, kind: "skill" }] },
  "srd-2024_ability-score-improvement": { abilities: [], choices: [asi(2, 20)] },
  "srd-2024_grappler": { abilities: ["note"], choices: [asi(1, 20, ["strength", "dexterity"])] },
  "srd-2024_archery": { abilities: [{ id: "archery", name: "Archery", core: { trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "attackBonus", flat: 2, attackKind: "ranged" }] } }] },
  "srd-2024_defense": {
    abilities: [{ id: "defense", name: "Defense", core: { trigger: { event: "passive" }, condition: { type: "armorWorn", categories: ["light", "medium", "heavy"] }, effects: [{ kind: "modifyStat", stat: "armor", flat: 1 }] } }],
  },
  "srd-2024_two-weapon-fighting": { abilities: [{ id: "two-weapon-fighting", name: "Two-Weapon Fighting", core: { trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "twoWeaponFighting" }] } }] },
  "srd-2024_boon-of-combat-prowess": boon,
  "srd-2024_boon-of-dimensional-travel": boon,
  "srd-2024_boon-of-fate": boon,
  "srd-2024_boon-of-irresistible-offense": boon,
  "srd-2024_boon-of-spell-recall": boon,
  "srd-2024_boon-of-the-night-spirit": boon,
  "srd-2024_boon-of-truesight": boon,
};
