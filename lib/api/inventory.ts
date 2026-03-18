/**
 * API сервіс для роботи з інвентарем персонажа
 */

import { campaignGet, campaignPatch } from "@/lib/api/client";
import type {
  EquippedItems,
  InventoryFormData,
  InventoryItem,
} from "@/types/inventory";

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
  characterId: string,
): Promise<Inventory> {
  return campaignGet<Inventory>(
    campaignId,
    `/characters/${characterId}/inventory`,
  );
}

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
