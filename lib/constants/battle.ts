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
 * Статус учасника в бою (combatStats.status)
 */
export const CombatStatus = {
  ACTIVE: "active",
  UNCONSCIOUS: "unconscious",
  DEAD: "dead",
} as const;

export const BattleActionType = {
  ATTACK: "attack",
  SPELL: "spell",
  BONUS_ACTION: "bonus_action",
  ABILITY: "ability",
  END_TURN: "end_turn",
  SKIP_TURN: "skip_turn",
  MORALE_SKIP: "morale_skip",
  RETALIATION: "retaliation",
} as const;

export type CombatStatusType = (typeof CombatStatus)[keyof typeof CombatStatus];

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
  
  /** Мінімальний відсоток HP (0%) */
  MIN_HP_PERCENT: 0,
  
  /** Максимальний відсоток HP (100%) */
  MAX_HP_PERCENT: 100,

  /** Загальний дільник для percent → fraction (e.g. 25% → 0.25). */
  PERCENT_DIVISOR: 100,

  /** Жорсткий cap відсоткового опору в бою (skill+racial sum ≤ 100%). */
  RESISTANCE_PERCENT_CAP: 100,

  /** Множник для конвертації fraction → percent (e.g. 0.25 → 25). */
  FRACTION_TO_PERCENT: 100,
} as const;

export const ParticipantSourceType = {
  CHARACTER: "character",
  UNIT: "unit",
} as const;

export type ParticipantSourceTypeValue = (typeof ParticipantSourceType)[keyof typeof ParticipantSourceType];

export const BATTLE_LOG_RECENT_EVENTS = 30;

export const BATTLE_LOG_PAGE_SIZE = 50;

export const BATTLE_LOG_PAGE_MAX = 100;

// відкат дозволено й для завершеного бою, тож знімки лишаються, але не всі
export const BATTLE_SNAPSHOTS_KEPT_AFTER_COMPLETE = 20;
