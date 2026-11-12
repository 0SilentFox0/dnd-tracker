import type { Ruleset } from "./schema";
import type { SectionMap } from "./sections";

export type MechanicKey = Exclude<keyof Ruleset, "system">;

export const mechanicRegistryOf = (sections: SectionMap): Partial<Record<MechanicKey, true>> =>
  Object.fromEntries(Object.entries(sections).filter(([, section]) => section.mechanic).map(([name]) => [name, true]));

// Static copy of mechanicRegistryOf(allSections()): this barrel must not pull the section registry into client bundles (a test keeps them equal)
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
  advancement: true,
  tables: true,
} satisfies Record<MechanicKey, true>;
