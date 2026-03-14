/**
 * Утиліти для калькулятора шкоди
 */

export interface DamagePreviewItem {
  total: number;
  breakdown: string[];
  diceFormula: string | null;
  hasWeapon: boolean;
}

export interface DamagePreviewResponse {
  melee: DamagePreviewItem;
  ranged: DamagePreviewItem;
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
): Promise<DamagePreviewResponse> {
  const params = new URLSearchParams();

  if (meleeMult !== 1) params.set("meleeMultiplier", String(meleeMult));

  if (rangedMult !== 1) params.set("rangedMultiplier", String(rangedMult));

  if (meleeDiceSum != null) params.set("meleeDiceSum", String(meleeDiceSum));

  if (rangedDiceSum != null) params.set("rangedDiceSum", String(rangedDiceSum));

  const qs = params.toString();

  const url = `/api/campaigns/${campaignId}/characters/${characterId}/damage-preview${qs ? `?${qs}` : ""}`;

  const res = await fetch(url);

  if (!res.ok) throw new Error("Failed to load damage preview");

  return res.json();
}
