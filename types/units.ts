import type { AbilityKey } from "@/lib/constants/abilities";
import { AttackType } from "@/lib/constants/battle";
import type { WeaponTrait } from "@/lib/constants/weapon-traits";
import type { Ability, ConversionIssue } from "@/lib/utils/abilities/schema";

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
  // per-target damage share in %, e.g. [50, 30, 20]
  damageDistribution?: number[];
  // applied even on a miss
  guaranteedDamage?: number;
  traits?: WeaponTrait[];
  versatileDice?: string;
}

export interface Unit {
  abilities?: Ability[];
  abilitySummary?: string[];
  abilityIssues?: ConversionIssue[];
  id: string;
  campaignId: string;
  name: string;
  raceId: string | null;
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
  gridSize: number;
  maxHp: number;
  proficiencyBonus: number;
  minTargets: number;
  maxTargets: number;
  attacks: UnitAttack[];
  immunities: string[];
  knownSpells: string[];
  avatar: string | null;
  cr?: number | null;
  xp?: number | null;
  multiattack?: number;
  legendaryActions?: number;
  legendaryResistances?: number;
  saveProficiencies?: AbilityKey[];
}
