import type { Coin, InventoryLogKindValue } from "@/lib/constants/inventory";

export type { Coin };

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
  gold: number;
  silver: number;
  copper: number;
  items: InventoryItem[];
  updatedAt: string;
}

export interface SpecialItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  consumable: boolean;
}

export type Purse = Record<Coin, number>;

export interface StashState {
  equipped: EquippedItems;
  stash: string[];
  items: SpecialItem[];
  purse: Purse;
}

export interface InventoryLogEntry {
  id: string;
  kind: InventoryLogKindValue;
  delta: Record<string, unknown>;
  note: string | null;
  createdAt: string;
  actor: { id: string; displayName: string | null };
}

export interface StashArtifact {
  id: string;
  name: string;
  icon: string | null;
  rarity: string | null;
  slot: string;
  description: string | null;
}

export interface StashView {
  purse: Purse;
  items: SpecialItem[];
  artifacts: StashArtifact[];
  freeArtifacts?: StashArtifact[];
}
