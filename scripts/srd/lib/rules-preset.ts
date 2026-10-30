import { type Ruleset, RulesetSchema } from "@/lib/utils/rules/schema";

// heroMin/heroMax: turn order uses a static initiative with no d20, so heroes take the same 5e bonus scale as SRD monsters (−5…+20)
export const SRD_RULES: Ruleset = RulesetSchema.parse({
  morale: { enabled: false },
  criticals: { critOn: 20, fumbleOn: 1, effects: false, doubleDice: true },
  formulas: {},
  initiative: { heroMin: 0, heroMax: 20, mode: "roll" },
  defaultAttacks: { meleeName: "Unarmed Strike", rangedName: "Ranged Attack" },
  saves: { proficiency: true },
  deathSaves: { enabled: true, unitsDieAtZero: true },
  concentration: { enabled: true },
  conditions: { enabled: true, exhaustion: "2024" },
  actions: { enabled: true, opportunityAttacks: true, retaliation: false, variant: "2024" },
  classes: { enabled: true },
  outOfCombat: { persistResources: true, longRestHitDice: "all", xp: true, inspiration: true },
  encounters: { balance: "xp", edition: "2024", autoXp: true },
  items: { enabled: true, attunementLimit: 3 },
  spellIngredients: { enabled: true, autoPay: true },
});
