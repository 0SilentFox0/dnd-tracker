import { getDamagePreview } from "@/lib/api/characters";
import type { DamagePreviewResponse } from "@/types/characters";

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

  if (!result) throw new Error("Не вдалося завантажити превʼю урону");

  return result;
}
