/**
 * Утиліти для калькулятора шкоди
 */

import { getDamagePreview } from "@/lib/api/characters";

/** Тип ефекту заклинання в превʼю магії (калькулятор) */
export type SpellEffectKind = "damage" | "heal" | "all";

export interface DamagePreviewItem {
  total: number;
  breakdown: string[];
  diceFormula: string | null;
  hasWeapon: boolean;
  spellEffectKind?: SpellEffectKind;
  /** Damage per AoE target (за damageDistribution). Default `[total]`. */
  targets?: number[];
  /** Сума по targets (якщо distribution > 1 елемент). */
  targetsTotal?: number;
  /** Distribution % per target (для UI відображення). */
  distribution?: number[] | null;
}

export interface DamagePreviewResponse {
  melee: DamagePreviewItem;
  ranged: DamagePreviewItem;
  /** Заповнюється при spellId + spellDiceSum у запиті */
  magic?: DamagePreviewItem | null;
}

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

export async function fetchDamagePreview(
  campaignId: string,
  characterId: string,
  meleeMult: number,
  rangedMult: number,
  meleeDiceSum: number | null,
  rangedDiceSum: number | null,
  spellId?: string | null,
  spellDiceSum?: number | null,
): Promise<DamagePreviewResponse> {
  const result = await getDamagePreview(campaignId, characterId, {
    meleeMultiplier: meleeMult,
    rangedMultiplier: rangedMult,
    meleeDiceSum,
    rangedDiceSum,
    spellId,
    spellDiceSum,
  });

  if (!result) throw new Error("Failed to load damage preview");

  return result as unknown as DamagePreviewResponse;
}
