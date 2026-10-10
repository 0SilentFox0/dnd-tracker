import { campaignPatch, campaignPost } from "@/lib/api/client";
import type { Inventory, InventoryFormData } from "@/types/inventory";

/**
 * Оновлює інвентар персонажа
 */
export async function updateInventory(
  campaignId: string,
  characterId: string,
  data: Partial<InventoryFormData>,
): Promise<Inventory> {
  return campaignPatch<Inventory>(
    campaignId,
    `/characters/${characterId}/inventory`,
    data,
  );
}

export const transferArtifact = (campaignId: string, characterId: string, body: { slot: string; toCharacterId: string }) =>
  campaignPost<{ from: Inventory; to: Inventory }>(campaignId, `/characters/${characterId}/artifacts/transfer`, body);
