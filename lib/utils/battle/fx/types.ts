export type FxArchetype = "melee" | "ranged" | "bolt" | "area" | "heal" | "buff" | "debuff" | "summon" | "death";

export type FxElement = "fire" | "cold" | "lightning" | "poison" | "necrotic" | "radiant" | "arcane" | "physical" | "nature";

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
