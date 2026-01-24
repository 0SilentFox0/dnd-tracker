/**
 * Enum для характеристик збереження заклинань
з * Значення наслідуються від ABILITY_SCORES
 */
import { ABILITY_SCORES } from "./abilities";

// Отримуємо ключі основних характеристик з ABILITY_SCORES
const ABILITY_KEYS = ABILITY_SCORES.slice(0, 6).map((a) => a.key);

export enum SpellSavingThrowAbility {
  STRENGTH = "strength",
  DEXTERITY = "dexterity",
  CONSTITUTION = "constitution",
  INTELLIGENCE = "intelligence",
  WISDOM = "wisdom",
  CHARISMA = "charisma",
}

// Перевірка що всі значення enum відповідають ABILITY_SCORES
const enumValues = Object.values(SpellSavingThrowAbility);

if (
  !enumValues.every((val) =>
    ABILITY_KEYS.includes(val as (typeof ABILITY_KEYS)[number])
  )
) {
  throw new Error(
    "SpellSavingThrowAbility enum values must match ABILITY_SCORES"
  );
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
}

/**
 * Масиви значень для використання в Zod схемах
 */
export const SPELL_TYPE_VALUES = [SpellType.TARGET, SpellType.AOE] as const;
export const SPELL_DAMAGE_TYPE_VALUES = [
  SpellDamageType.DAMAGE,
  SpellDamageType.HEAL,
  SpellDamageType.ALL,
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
