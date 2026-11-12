import type { Ruleset } from "./schema";

export const heroHpFormula = (h: Ruleset["heroScaling"]) => ({ baseLevels: h.hpBaseLevels, conCoefficient: h.hpConCoefficient });
