import type { Ruleset } from "./schema";

export type MechanicKey = keyof Ruleset;

export const MECHANIC_REGISTRY = {
  morale: true,
  criticals: true,
  formulas: true,
  heroScaling: true,
  initiative: true,
  defaultAttacks: true,
  saves: true,
  deathSaves: true,
  concentration: true,
  actions: true,
  classes: true,
  conditions: true,
  outOfCombat: true,
  encounters: true,
  items: true,
  spellIngredients: true,
} satisfies Record<MechanicKey, true>;
