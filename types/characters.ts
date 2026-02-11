/**
 * Типи для персонажів
 */

import type { EquippedItems, InventoryItem } from "./inventory";

/**
 * Згрупована структура даних персонажа (як використовується в формі)
 */
export interface CharacterFormData {
  basicInfo: {
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
  };
  abilityScores: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  combatStats: {
    armorClass: number;
    initiative: number;
    speed: number;
    maxHp: number;
    currentHp: number;
    tempHp: number;
    hitDice: string;
    minTargets: number;
    maxTargets: number;
    morale: number;
  };
  skills: {
    savingThrows: Record<string, boolean>;
    skills: Record<string, boolean>;
  };
  spellcasting: {
    spellcastingClass?: string;
    spellcastingAbility?: "intelligence" | "wisdom" | "charisma";
    spellSlots?: Record<string, { max: number; current: number }>;
    knownSpells: string[];
  };
  roleplay: {
    languages: string[];
    proficiencies: Record<string, string[]>;
    immunities?: string[];
    personalityTraits?: string;
    ideals?: string;
    bonds?: string;
    flaws?: string;
  };
  /** Уміння: скіл з групи «Персональні» */
  abilities: {
    personalSkillId: string;
  };
  /** Коефіцієнти масштабування (HP, melee, ranged) — окремі для кожного героя */
  scalingCoefficients?: {
    hpMultiplier: number;
    meleeMultiplier: number;
    rangedMultiplier: number;
  };
  /** Прогрес по деревах прокачки: skillTreeId → { unlockedSkills } */
  skillTreeProgress?: Record<
    string,
    { level?: string; unlockedSkills?: string[] }
  >;
}

/**
 * Плоска структура персонажа (як зберігається в БД та повертається з API)
 */
export interface Character {
  id: string;
  campaignId: string;
  type: string;
  controlledBy: string;
  name: string;
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
  minTargets: number;
  maxTargets: number;
  personalSkillId?: string | null;
  /** Коефіцієнт HP (×). За замовчуванням 1. */
  hpMultiplier?: number | null;
  /** Коефіцієнт урону ближнього бою (×). За замовчуванням 1. */
  meleeMultiplier?: number | null;
  /** Коефіцієнт урону дальнього бою (×). За замовчуванням 1. */
  rangedMultiplier?: number | null;
  /** Прогрес по деревах прокачки: skillTreeId → { unlockedSkills } */
  skillTreeProgress?: Record<
    string,
    { level?: string; unlockedSkills?: string[] }
  >;
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
