/**
 * Типи для імпорту даних
 */

import {
  SpellDamageType,
  SpellSavingThrowAbility,
  SpellSavingThrowOnSuccess,
  SpellType,
} from "@/lib/constants/spell-abilities";

// Unit Import
export interface CSVUnitRow {
  [key: string]: string | undefined;
  Tier?: string;
  tier?: string;
  Назва?: string;
  name?: string;
  Name?: string;
  КД?: string;
  ac?: string;
  AC?: string;
  ХП?: string;
  hp?: string;
  HP?: string;
  Швидкість?: string;
  speed?: string;
  Speed?: string;
  СИЛ?: string;
  str?: string;
  STR?: string;
  ЛОВ?: string;
  dex?: string;
  DEX?: string;
  ТІЛ?: string;
  con?: string;
  CON?: string;
  ІНТ?: string;
  int?: string;
  INT?: string;
  МДР?: string;
  wis?: string;
  WIS?: string;
  ХАР?: string;
  cha?: string;
  CHA?: string;
  "Навички/Здібності"?: string;
  abilities?: string;
  Abilities?: string;
  Спасброски?: string;
  saving?: string;
  Saving?: string;
  Атаки?: string;
  attacks?: string;
  Attacks?: string;
  Особливості?: string;
  features?: string;
  Features?: string;
  Група?: string;
  group?: string;
  Group?: string;
}

export interface UnitAttack {
  name: string;
  attackBonus: number;
  damageType: string;
  damageDice: string;
  range?: string;
  properties?: string;
}

export interface UnitSpecialAbility {
  name: string;
  description: string;
  type: "passive" | "active";
  effect?: Record<string, unknown>;
}

export interface ImportUnit {
  name: string;
  groupId?: string;
  level: number;
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
  proficiencyBonus: number;
  attacks: UnitAttack[];
  specialAbilities: UnitSpecialAbility[];
  knownSpells: string[];
  avatar?: string;
  damageModifier?: string;
}

export interface UnitImportResult {
  imported: number;
  total: number;
  skipped: number;
}

// Spell Import
export interface CSVSpellRow {
  [key: string]: string | undefined;
  Level?: string;
  level?: string;
  Effect?: string;
  effect?: string;
  School?: string;
  school?: string;
  "UA Name"?: string;
  name?: string;
  Name?: string;
  "Original Name"?: string;
  originalName?: string;
}

export interface ImportSpell {
  name: string;
  level: number;
  school?: string;
  type: SpellType;
  damageType: SpellDamageType;
  damageElement?: string;
  castingTime?: string;
  range?: string;
  components?: string;
  duration?: string;
  concentration: boolean;
  damageDice?: string;
  savingThrowAbility?: SpellSavingThrowAbility;
  savingThrowOnSuccess?: SpellSavingThrowOnSuccess;
  description: string;
  groupId?: string;
}

export interface SpellImportResult {
  imported: number;
  total: number;
}

// CSV Row
export interface CSVRow {
  [key: string]: string | undefined;
}
