/**
 * Типи для інвентаря
 */

export interface InventoryItem {
  name: string;
  quantity?: number;
  [key: string]: unknown;
}

export interface EquippedItems {
  head?: string;
  neck?: string;
  shoulders?: string;
  chest?: string;
  waist?: string;
  legs?: string;
  feet?: string;
  wrist?: string;
  hands?: string;
  finger1?: string;
  finger2?: string;
  trinket?: string;
  mainHand?: string;
  offHand?: string;
  [key: string]: string | undefined;
}

export interface InventoryFormData {
  gold: number;
  silver: number;
  copper: number;
  equipped: EquippedItems;
  backpack: InventoryItem[];
  items: InventoryItem[];
}

export interface Inventory {
  id: string;
  characterId: string;
  equipped: EquippedItems;
  backpack: InventoryItem[];
  items: InventoryItem[];
  gold: number;
  silver: number;
  copper: number;
  updatedAt: string;
}
