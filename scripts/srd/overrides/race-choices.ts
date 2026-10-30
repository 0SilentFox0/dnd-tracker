import type { AbilityCore } from "../lib/abilities";

import type { DndSkill } from "@/lib/constants/skills";
import type { FeatType } from "@/types/choices";

export type RaceChoiceTrait =
  | { kind: "lineage"; parse: "levels" | "bold" | "damage" | "bullets"; breath?: true }
  | { kind: "skill"; skills?: DndSkill[] }
  | { kind: "feat"; featTypes: FeatType[] };

export const RACE_CHOICE_TRAITS: Record<string, RaceChoiceTrait> = {
  "srd-2024_elf_elven-lineage": { kind: "lineage", parse: "levels" },
  "srd-2024_elf_keen-senses": { kind: "skill", skills: ["insight", "perception", "survival"] },
  "srd-2024_gnome_gnomish-lineage": { kind: "lineage", parse: "bold" },
  "srd-2024_tiefling_fiendish-legacy": { kind: "lineage", parse: "levels" },
  "srd-2024_dragonborn_draconic-ancestry": { kind: "lineage", parse: "damage", breath: true },
  "srd-2024_goliath_giant-ancestry": { kind: "lineage", parse: "bullets" },
  "srd-2024_human_skillful": { kind: "skill" },
  "srd-2024_human_versatile": { kind: "feat", featTypes: ["origin"] },
};

// replaced by the resistance inside the chosen ancestry
export const DROP_RACE_TRAITS: ReadonlySet<string> = new Set(["srd-2024_dragonborn_damage-resistance"]);

const giantHit = (amount: string, damageType: string): AbilityCore => ({
  trigger: { event: "hit", role: "attacker" },
  limits: { perTurn: 1, perRest: { rest: "long", uses: { formula: "prof" } } },
  effects: [{ kind: "dealDamage", amount, damageType, target: "eventTarget" }],
});

export const OPTION_ABILITIES: Record<string, Array<{ id: string; name: string; core: AbilityCore }>> = {
  "elf:drow": [{ id: "superior-darkvision", name: "Superior Darkvision", core: { trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "sense", sense: "darkvision", range: 120 }] } }],
  "elf:wood-elf": [{ id: "wood-elf-speed", name: "Wood Elf Speed", core: { trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "speed", flat: 5 }] } }],
  "goliath:fire-giant": [{ id: "fires-burn", name: "Fire's Burn", core: giantHit("1d10", "fire") }],
  "goliath:frost-giant": [{ id: "frosts-chill", name: "Frost's Chill", core: giantHit("1d6", "cold") }],
  "goliath:hill-giant": [
    {
      id: "hills-tumble",
      name: "Hill's Tumble",
      core: { trigger: { event: "hit", role: "attacker" }, limits: { perTurn: 1, perRest: { rest: "long", uses: { formula: "prof" } } }, effects: [{ kind: "applyCondition", condition: "prone", duration: { rounds: 1 }, target: "eventTarget" }] },
    },
  ],
  "goliath:stone-giant": [
    {
      id: "stones-endurance",
      name: "Stone's Endurance",
      core: { trigger: { event: "hit", role: "target" }, limits: { perRound: 1, perRest: { rest: "long", uses: { formula: "prof" } } }, effects: [{ kind: "heal", amount: "1d12", target: "self" }, { kind: "heal", amount: { formula: "con_mod" }, target: "self" }] },
    },
  ],
};
