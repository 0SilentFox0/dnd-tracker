/**
 * Типи для персонажів
 */

import type { InventoryItem, EquippedItems } from "./inventory";

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
  morale?: number;
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
    items: InventoryItem[];
    gold: number;
    silver: number;
    copper: number;
  };
}
