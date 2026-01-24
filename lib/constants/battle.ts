/**
 * Константи для бою
 */

/**
 * Enum для типів атаки
 */
export enum AttackType {
  MELEE = "melee",
  RANGED = "ranged",
}

/**
 * Enum для сторін учасника бою
 */
export enum ParticipantSide {
  ALLY = "ally",
  ENEMY = "enemy",
}

/**
 * Глобальні константи бою
 */
export const BATTLE_CONSTANTS = {
  /** Мінімальне значення урону */
  MIN_DAMAGE: 0,
  
  /** Максимальне значення імунітету/опору (1.0 = 100%) */
  MAX_RESISTANCE: 1.0,
  
  /** Мінімальне значення опору */
  MIN_RESISTANCE: 0,
  
  /** За замовчуванням опір (якщо не вказано значення) */
  DEFAULT_RESISTANCE_PERCENT: 50,
  
  /** За замовчуванням поріг низького HP для пасивних здібностей (якщо не вказано) */
  DEFAULT_LOW_HP_THRESHOLD_PERCENT: 15,
  
  /** Мінімальний відсоток HP (0%) */
  MIN_HP_PERCENT: 0,
  
  /** Максимальний відсоток HP (100%) */
  MAX_HP_PERCENT: 100,
} as const;
