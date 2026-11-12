import type { Ruleset } from "./schema";

export const proficiencyForLevel = (level: number, f: Ruleset["formulas"]) =>
  f.proficiencyBase + Math.floor((Math.max(1, level) - 1) / f.proficiencyEvery);

export const heroHpFormula = (h: Ruleset["heroScaling"]) => ({ baseLevels: h.hpBaseLevels, conCoefficient: h.hpConCoefficient });
