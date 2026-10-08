import { AttackType } from "@/lib/constants/battle";

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
  Initiative?: string;
  initiative?: string;
  Image?: string;
  image?: string;
  URL?: string;
}

export interface UnitAttack {
  name: string;
  type?: AttackType;
  targetType?: "target" | "aoe";
  attackBonus: number;
  damageType: string;
  damageDice: string;
  range?: string;
  properties?: string;
  maxTargets?: number;
  damageDistribution?: number[];
  guaranteedDamage?: number;
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
