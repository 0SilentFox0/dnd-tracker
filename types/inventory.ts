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
  attuned?: string[];
  updatedAt: string;
}

export interface SpecialItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  consumable: boolean;
  artifactId?: string;
  parameter?: string;
  spellId?: string;
  worthGp?: number;
  ingredient?: string;
}

export type Purse = Record<Coin, number>;

export interface StashState {
  equipped: EquippedItems;
  stash: string[];
  attuned?: string[];
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
  light?: boolean;
  attunement?: "attuned" | "required";
  carried?: true;
  charges?: { max: number; left: number; rest: "short" | "long" | null };
  gear?: true;
}

export type FreeArtifact = Omit<StashArtifact, "description" | "attunement" | "carried" | "charges"> & { property?: { nameTemplate?: string; bases: string[] }; parameter?: { kind: "damageType" | "creatureType"; options: Array<{ key: string; label: string }> }; spells?: Array<{ spellId: string; label: string; castLevel?: number }>; consumable?: true };

export interface StashView {
  purse: Purse;
  items: SpecialItem[];
  artifacts: StashArtifact[];
  attunement?: { used: number; limit: number };
}
