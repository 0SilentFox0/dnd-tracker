/**
 * Enum для характеристик збереження заклинань
 */
export enum SpellSavingThrowAbility {
  STRENGTH = "strength",
  DEXTERITY = "dexterity",
  CONSTITUTION = "constitution",
  INTELLIGENCE = "intelligence",
  WISDOM = "wisdom",
  CHARISMA = "charisma",
}

/**
 * Enum для результатів збереження
 */
export enum SpellSavingThrowOnSuccess {
  HALF = "half",
  NONE = "none",
}

/**
 * Enum для типів заклинань
 */
export enum SpellType {
  TARGET = "target",
  AOE = "aoe",
}

/**
 * Enum для типів шкоди заклинань
 */
export enum SpellDamageType {
  DAMAGE = "damage",
  HEAL = "heal",
  ALL = "all",
  BUFF = "buff",
  DEBUFF = "debuff",
}
