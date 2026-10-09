import { getHeroMaxHpBreakdown } from "@/lib/constants/hero-scaling";

export function heroBaseHp(c: { level: number; constitution: number; archetype?: string | null }) {
  return getHeroMaxHpBreakdown(c.level, c.constitution, c.archetype);
}
