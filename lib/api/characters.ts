/**
 * API сервіс для роботи з персонажами
 */

import { InventoryItem, EquippedItems } from "@/lib/types/inventory";

export interface CharacterFormData {
  name: string;
  type: "player" | "npc_hero";
  controlledBy: string;
  level: number;
  class: string;
  subclass?: string;
  race: string;
  subrace?: string;
  alignment?: string;
  background?: string;
  experience: number;
  avatar?: string;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  armorClass: number;
  initiative: number;
  speed: number;
  maxHp: number;
  currentHp: number;
  tempHp: number;
  hitDice: string;
  savingThrows: Record<string, boolean>;
  skills: Record<string, boolean>;
  spellcastingClass?: string;
  spellcastingAbility?: "intelligence" | "wisdom" | "charisma";
  spellSlots?: Record<string, { max: number; current: number }>;
  knownSpells: string[];
  languages: string[];
  proficiencies: Record<string, string[]>;
  immunities?: string[];
  personalityTraits?: string;
  ideals?: string;
  bonds?: string;
  flaws?: string;
}

export interface Character extends CharacterFormData {
  id: string;
  campaignId: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    displayName: string;
    email: string;
  };
  inventory?: {
    id: string;
    equipped: EquippedItems;
    backpack: InventoryItem[];
    gold: number;
    silver: number;
    copper: number;
    items: InventoryItem[];
  };
}

/**
 * Отримує персонажа за ID
 */
export async function getCharacter(
  campaignId: string,
  characterId: string
): Promise<Character> {
  const response = await fetch(`/api/campaigns/${campaignId}/characters/${characterId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch character");
  }
  return response.json();
}

/**
 * Отримує список персонажів кампанії
 */
export async function getCharacters(campaignId: string): Promise<Character[]> {
  const response = await fetch(`/api/campaigns/${campaignId}/characters`);
  if (!response.ok) {
    throw new Error("Failed to fetch characters");
  }
  return response.json();
}

/**
 * Створює нового персонажа
 */
export async function createCharacter(
  campaignId: string,
  data: CharacterFormData
): Promise<Character> {
  const response = await fetch(`/api/campaigns/${campaignId}/characters`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create character");
  }

  return response.json();
}

/**
 * Оновлює персонажа
 */
export async function updateCharacter(
  campaignId: string,
  characterId: string,
  data: Partial<CharacterFormData>
): Promise<Character> {
  const response = await fetch(`/api/campaigns/${campaignId}/characters/${characterId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update character");
  }

  return response.json();
}

/**
 * Видаляє персонажа
 */
export async function deleteCharacter(
  campaignId: string,
  characterId: string
): Promise<void> {
  const response = await fetch(`/api/campaigns/${campaignId}/characters/${characterId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete character");
  }
}
