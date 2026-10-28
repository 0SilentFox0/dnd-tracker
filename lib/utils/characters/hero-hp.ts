import { getHeroMaxHpBreakdown, type HeroHpFormula } from "@/lib/constants/hero-scaling";
import { classHp, hitDiceLabel } from "@/lib/utils/characters/classes";
import type { ResolvedClassEntry } from "@/types/classes";

export function heroBaseHp(c: { level: number; constitution: number; archetype?: string | null }, hp?: HeroHpFormula) {
  return getHeroMaxHpBreakdown(c.level, c.constitution, c.archetype, hp);
}

/** Class entries (when any resolves) win over the HOMM hero formula. */
export function characterBaseHp(
  c: { level: number; constitution: number; archetype?: string | null },
  opts: { entries?: ResolvedClassEntry[] | null; formula?: HeroHpFormula },
) {
  const entries = opts.entries?.some((e) => e.class) ? opts.entries : null;

  return entries ? { total: classHp(entries, c.constitution), breakdown: [`Кістки хітів: ${hitDiceLabel(entries)}`] } : heroBaseHp(c, opts.formula);
}
