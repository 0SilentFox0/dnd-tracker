/**
 * API сервіс для роботи з інвентарем персонажа
 */

import { EquippedItems,InventoryFormData, InventoryItem } from "@/types/inventory";

export interface Inventory {
  id: string;
  characterId: string;
  equipped: EquippedItems;
  backpack: InventoryItem[];
  gold: number;
  silver: number;
  copper: number;
  items: InventoryItem[];
  updatedAt: string;
}

/**
 * Отримує інвентар персонажа
 */
export async function getInventory(
  campaignId: string,
  characterId: string
): Promise<Inventory> {
  const response = await fetch(
    `/api/campaigns/${campaignId}/characters/${characterId}/inventory`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch inventory");
  }

  return response.json();
}

/**
 * Оновлює інвентар персонажа
 */
export async function updateInventory(
  campaignId: string,
  characterId: string,
  data: Partial<InventoryFormData>
): Promise<Inventory> {
  const response = await fetch(
    `/api/campaigns/${campaignId}/characters/${characterId}/inventory`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const error = await response.json();

    throw new Error(error.error || "Failed to update inventory");
  }

  return response.json();
}
