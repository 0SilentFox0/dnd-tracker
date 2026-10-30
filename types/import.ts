import type { UnitAttack } from "@/types/units";

// Unit Import
export interface CSVUnitRow {
  [key: string]: string | undefined;
  Tier?: string;
  tier?: string;
  name?: string;
  Name?: string;
  ac?: string;
  AC?: string;
  hp?: string;
  HP?: string;
  speed?: string;
  Speed?: string;
  str?: string;
  STR?: string;
  dex?: string;
  DEX?: string;
  con?: string;
  CON?: string;
  int?: string;
  INT?: string;
  wis?: string;
  WIS?: string;
  cha?: string;
  CHA?: string;
  abilities?: string;
  Abilities?: string;
  saving?: string;
  Saving?: string;
  attacks?: string;
  Attacks?: string;
  features?: string;
  Features?: string;
  group?: string;
  Group?: string;
  Initiative?: string;
  initiative?: string;
  Image?: string;
  image?: string;
  URL?: string;
}

export interface UnitSpecialAbility {
  name: string;
  description: string;
  type: "passive" | "active";
  effect?: Record<string, unknown>;
}

export interface ImportUnit {
  name: string;
  raceName?: string;
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
}

export interface UnitImportResult {
  imported: number;
  total: number;
  skipped: number;
  unknownRaces: string[];
}

// CSV Row
export interface CSVRow {
  [key: string]: string | undefined;
}
