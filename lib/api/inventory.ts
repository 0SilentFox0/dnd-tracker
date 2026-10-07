import { campaignPatch } from "@/lib/api/client";
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
