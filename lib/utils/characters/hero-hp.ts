import { getHeroMaxHpBreakdown, type HeroHpFormula } from "@/lib/constants/hero-scaling";

export function heroBaseHp(c: { level: number; constitution: number; archetype?: string | null }, hp?: HeroHpFormula) {
  return getHeroMaxHpBreakdown(c.level, c.constitution, c.archetype, hp);
}
