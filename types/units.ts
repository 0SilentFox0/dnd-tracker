/**
 * Типи для юнітів
 */

export interface Unit {
  id: string;
  campaignId: string;
  name: string;
  race: string | null;
  groupId: string | null;
  groupColor: string | null;
  damageModifier: string | null;
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
  attacks: Array<{
    name: string;
    attackBonus: number;
    damageType: string;
    damageDice: string;
    range?: string;
    properties?: string;
  }>;
  specialAbilities: Array<{
    name: string;
    description?: string;
    type: "passive" | "active";
    spellId?: string;
    actionType?: "action" | "bonus_action";
    effect?: Record<string, unknown>;
  }>;
  immunities: string[];
  knownSpells: string[];
  avatar: string | null;
  unitGroup?: {
    id: string;
    name: string;
    color: string;
    damageModifier: string | null;
  } | null;
}

export interface UnitGroup {
  id: string;
  campaignId: string;
  name: string;
  color: string;
  damageModifier: string | null;
  createdAt: string;
}
