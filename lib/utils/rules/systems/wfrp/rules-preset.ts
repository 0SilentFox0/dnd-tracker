import { RulesetSchema } from "@/lib/utils/rules/schema";

export const WFRP_RULES = RulesetSchema.parse({
  system: { key: "wfrp" },
  morale: { enabled: false },
  classes: { enabled: false },
  deathSaves: { enabled: false },
  concentration: { enabled: false },
  conditions: { enabled: false },
  actions: { enabled: false },
  outOfCombat: { persistResources: true, xp: true, inspiration: false },
  encounters: { balance: "fair" },
});
