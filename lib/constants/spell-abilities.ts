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
 * Enum для типів урону заклинань
 */
export enum SpellDamageType {
  DAMAGE = "damage",
  HEAL = "heal",
}

/**
 * Масиви значень для використання в Zod схемах
 */
export const SPELL_TYPE_VALUES = [SpellType.TARGET, SpellType.AOE] as const;
export const SPELL_DAMAGE_TYPE_VALUES = [
  SpellDamageType.DAMAGE,
  SpellDamageType.HEAL,
] as const;
export const SPELL_SAVING_THROW_ABILITY_VALUES = [
  SpellSavingThrowAbility.STRENGTH,
  SpellSavingThrowAbility.DEXTERITY,
  SpellSavingThrowAbility.CONSTITUTION,
  SpellSavingThrowAbility.INTELLIGENCE,
  SpellSavingThrowAbility.WISDOM,
  SpellSavingThrowAbility.CHARISMA,
] as const;
export const SPELL_SAVING_THROW_ON_SUCCESS_VALUES = [
  SpellSavingThrowOnSuccess.HALF,
  SpellSavingThrowOnSuccess.NONE,
] as const;
