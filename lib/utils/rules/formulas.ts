import { DEFAULT_RULES } from "./defaults";
import type { Ruleset } from "./schema";

export const proficiencyForLevel = (level: number, f: Ruleset["formulas"]) =>
  f.proficiencyBase + Math.floor((Math.max(1, level) - 1) / f.proficiencyEvery);

export function heroDiceTable(rules: Ruleset, kind: "melee" | "ranged"): Record<number, string> | undefined {
  const t = kind === "melee" ? rules.heroScaling.meleeDiceByLevel : rules.heroScaling.rangedDiceByLevel;

  return t ? Object.fromEntries(Object.entries(t).map(([k, v]) => [Number(k), v])) : undefined;
}

export const heroHpFormula = (h: Ruleset["heroScaling"]) => ({ baseLevels: h.hpBaseLevels, conCoefficient: h.hpConCoefficient });

export const moraleCapFromRules = (rules: Ruleset = DEFAULT_RULES) => (rules.morale.enabled ? rules.morale.cap : 0);
