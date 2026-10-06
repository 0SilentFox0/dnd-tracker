/**
 * Типи для персонажів
 */

import type { EquippedItems, InventoryItem } from "./inventory";
import type { BookSpell } from "./spells";

export const ABILITY_KEYS = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] as const;

export type AbilityKey = (typeof ABILITY_KEYS)[number];

export type GoalStatus = "active" | "done" | "failed";

export interface CharacterGoal {
  id: string;
  text: string;
  status: GoalStatus;
  author: "dm" | "player";
}

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
    primaryAbility: AbilityKey | null;
  };
  combatStats: {
    armorClass: number;
    initiative: number;
    speed: number;
    maxHp: number;
    currentHp: number;
    tempHp: number;
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
  savingThrows: Record<string, boolean>;
  skills: Record<string, boolean>;
  spellcastingClass?: string;
  spellcastingAbility?: "intelligence" | "wisdom" | "charisma" | null;
  spellSlots?: Record<string, { max: number; current: number }>;
  knownSpells: string[];
  languages: string[];
  proficiencies: Record<string, string[]>;
  immunities?: string[];
  morale?: number;
  minTargets: number;
  maxTargets: number;
  personalSkillId?: string | null;
  primaryAbility?: AbilityKey | null;
  goals?: CharacterGoal[];
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
  seenLevel?: number | null;
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

export type SpellEffectKind = "damage" | "heal" | "all";

export interface DamagePreviewItem {
  total: number;
  breakdown: string[];
  diceFormula: string | null;
  hasWeapon: boolean;
  spellEffectKind?: SpellEffectKind;
  /** Damage per AoE target (за damageDistribution). Default `[total]`. */
  targets?: number[];
  targetsTotal?: number;
  distribution?: number[] | null;
}

export interface DamagePreviewResponse {
  melee: DamagePreviewItem;
  ranged: DamagePreviewItem;
  /** Заповнюється при spellId + spellDiceSum у запиті */
  magic?: DamagePreviewItem | null;
}

export type SheetLineSource = "base" | "ability" | "proficiency" | "weapon" | "level" | "dice" | "skill" | "race" | "artifact" | "artifactSet" | "unit" | "character" | "effect" | "action" | "multiplier";

export interface SheetLine {
  label: string;
  value: string;
  source?: SheetLineSource;
}

export interface SheetTotal {
  total: number;
  lines: SheetLine[];
}

export interface SheetAbility {
  key: AbilityKey;
  score: number;
  mod: number;
  isPrimary: boolean;
  lines: SheetLine[];
}

export interface SheetAttack {
  id: string;
  name: string;
  kind: "melee" | "ranged";
  toHit: SheetTotal;
  avgDamage: SheetTotal;
}

export interface SheetCheck {
  key: string;
  label: string;
  ability: AbilityKey;
  bonus: number;
  proficient: boolean;
}

export interface SheetArtifact {
  id: string;
  name: string;
  icon: string | null;
  slot: string;
  rarity: string | null;
  description: string | null;
  effects: string[];
}

export interface SheetSet {
  id: string;
  name: string;
  have: number;
  total: number;
  complete: boolean;
  effects: string[];
}

export interface CharacterSheet {
  viewer: { isDM: boolean; isOwner: boolean };
  identity: { id: string; name: string; avatar: string | null; level: number; className: string; subclass: string | null; race: string; raceIcon: string | null; alignment: string | null };
  abilities: SheetAbility[];
  primaryAbility: AbilityKey | null;
  proficiency: number;
  hp: SheetTotal;
  armorClass: SheetTotal;
  initiative: number;
  speed: number;
  morale: number;
  targets: { min: number; max: number };
  immunities: string[];
  languages: string[];
  proficiencies: string[];
  attacks: SheetAttack[];
  bestToHit: number | null;
  saves: SheetCheck[];
  skills: SheetCheck[];
  passives: { perception: number; investigation: number; insight: number };
  magic: { ability: string; saveDC: number; attackBonus: number } | null;
  slots: { level: number; count: number }[];
  spells: BookSpell[];
  items: { grid: Record<string, SheetArtifact | null>; artifacts: SheetArtifact[]; sets: SheetSet[] };
  personalSkill: { id: string; name: string; icon: string | null; description: string | null } | null;
  story: { biography: string | null; goals: CharacterGoal[] };
}
