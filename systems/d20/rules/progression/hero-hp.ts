import { getHeroMaxHpBreakdown } from "@/lib/constants/hero-scaling";
import type { HpBreakdownLine } from "@/lib/utils/characters/hero-hp";
import type { Ruleset } from "@/lib/utils/rules/schema";
import type { CharacterHpInput } from "@/lib/utils/rules/systems/types";

export const heroBaseHp = (c: CharacterHpInput, scaling: Ruleset["heroScaling"]) =>
  getHeroMaxHpBreakdown(c.level, c.constitution, c.archetype, { baseLevels: scaling.hpBaseLevels, conCoefficient: scaling.hpConCoefficient });

export function heroHpFallback(c: CharacterHpInput, scaling: Ruleset["heroScaling"]): { total: number; breakdown: HpBreakdownLine[] } {
  const hero = heroBaseHp(c, scaling);

  return { total: hero.total, breakdown: hero.breakdown.map((line) => ({ label: line.message, params: line.params })) };
}
