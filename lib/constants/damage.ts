export const DAMAGE_ELEMENT_OPTIONS = [
  { value: "fire" },
  { value: "cold" },
  { value: "lightning" },
  { value: "acid" },
  { value: "poison" },
  { value: "necrotic" },
  { value: "radiant" },
  { value: "thunder" },
  { value: "psychic" },
  { value: "force" },
  { value: "bludgeoning" },
  { value: "piercing" },
  { value: "slashing" },
  { value: "bleed" },
] as const;

export const PHYSICAL_DAMAGE_TYPES: readonly string[] = ["slashing", "piercing", "bludgeoning", "physical"];
