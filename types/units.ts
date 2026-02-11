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
  minTargets: number;
  maxTargets: number;
  attacks: Array<{
    name: string;
    type?: "melee" | "ranged"; // вид атаки: ближня / дальня
    targetType?: "target" | "aoe"; // одна ціль або область
    attackBonus: number;
    damageType: string;
    damageDice: string;
    range?: string;
    properties?: string;
    maxTargets?: number; // для AOE: макс. кількість цілей
    /** Розподіл шкоди по цілях (%): [50, 30, 20] — перша 50%, друга 30%, третя 20% */
    damageDistribution?: number[];
    /** Гарантована шкода — застосовується навіть при промаху */
    guaranteedDamage?: number;
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
