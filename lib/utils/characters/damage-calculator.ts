export type { DamagePreviewItem, DamagePreviewResponse, SpellEffectKind } from "@/types/characters";

export interface SkillAffectingDamage {
  id: string;
  name: string;
  damageType: "melee" | "ranged" | "magic" | null;
}

/** Парсить формулу кубиків "1d6", "2d8+1d4" у масив граней: [6, 8, 8, 4] */
export function parseDiceFormulaToSides(formula: string | null): number[] {
  if (!formula || !formula.trim()) return [];

  const parts = formula.split("+").map((p) => p.trim());

  const sides: number[] = [];

  for (const p of parts) {
    const m = p.match(/^(\d*)d(\d+)$/i);

    if (m) {
      const count = m[1] ? parseInt(m[1], 10) : 1;

      const s = parseInt(m[2], 10);

      for (let i = 0; i < count; i++) sides.push(s);
    }
  }

  return sides;
}
