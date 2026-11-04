import { getHeroMaxHpBreakdown, type HeroHpFormula } from "@/lib/constants/hero-scaling";
import { classHp, hitDiceLabel } from "@/lib/utils/characters/classes";
import { sheetLineKey } from "@/lib/utils/characters/sheet/line-key";
import type { Ruleset } from "@/lib/utils/rules/schema";
import { readCharacteristics, ruleSystemOf } from "@/lib/utils/rules/systems";
import type { TextRef } from "@/types/choices";
import type { ResolvedClassEntry } from "@/types/classes";

export interface HpBreakdownLine {
  label: string;
  params?: TextRef["params"];
}

export function heroBaseHp(c: { level: number; constitution: number; archetype?: string | null }, hp?: HeroHpFormula) {
  return getHeroMaxHpBreakdown(c.level, c.constitution, c.archetype, hp);
}

/** Class entries (when any resolves) win over the HOMM hero formula. */
export function characterBaseHp(
  c: { level: number; constitution: number; archetype?: string | null },
  opts: { entries?: ResolvedClassEntry[] | null; formula?: HeroHpFormula; rules?: Ruleset; characteristics?: unknown },
): { total: number; breakdown: HpBreakdownLine[] } {
  if (opts.rules) {
    const hp = ruleSystemOf(opts.rules).progression.maxHp({ character: c, characteristics: readCharacteristics({ characteristics: opts.characteristics }), rules: opts.rules });

    if (hp) return hp;
  }

  const entries = opts.entries?.some((e) => e.class) ? opts.entries : null;

  if (entries) return { total: classHp(entries, c.constitution), breakdown: [{ label: sheetLineKey("hitDice"), params: { dice: hitDiceLabel(entries) } }] };

  const hero = heroBaseHp(c, opts.formula);

  return { total: hero.total, breakdown: hero.breakdown.map((line) => ({ label: line.message, params: line.params })) };
}
