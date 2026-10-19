export type FxArchetype = "melee" | "ranged" | "bolt" | "area" | "heal" | "buff" | "debuff" | "summon" | "death" | "swarm" | "quake" | "teleport" | "entangle" | "meteor" | "eldritch" | "slow" | "haste" | "stoneskin" | "cleanse" | "regenerate" | "might" | "deflect" | "holyword" | "empower" | "spellward" | "sunbeam" | "retribution" | "resurrect" | "siphon" | "rust" | "pestilence" | "whispers" | "thorns" | "raincloud" | "blindfold" | "puppet" | "netherhands";

export type FxElement = "fire" | "cold" | "lightning" | "poison" | "necrotic" | "radiant" | "arcane" | "physical" | "nature" | "earth" | "fury" | "wind";

export interface FxSpec {
  key: string;
  archetype: FxArchetype;
  element: FxElement;
  actorId: string;
  actorSide: string;
  targetIds: string[];
  hit: boolean;
  critical: boolean;
}
