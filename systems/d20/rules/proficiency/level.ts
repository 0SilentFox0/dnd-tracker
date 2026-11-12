import type { Ruleset } from "@/lib/utils/rules/schema";

export const proficiencyForLevel = (level: number, f: Ruleset["formulas"]) =>
  f.proficiencyBase + Math.floor((Math.max(1, level) - 1) / f.proficiencyEvery);
