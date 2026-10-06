import { getHeroMaxHpBreakdown } from "@/lib/constants/hero-scaling";

export function heroBaseHp(c: { level: number; strength: number; hpMultiplier?: number | null }) {
  return getHeroMaxHpBreakdown(c.level, c.strength, { hpMultiplier: c.hpMultiplier ?? 1 });
}
