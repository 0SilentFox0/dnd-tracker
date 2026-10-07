export const AttackType = {
  MELEE: "melee",
  RANGED: "ranged",
} as const;

export type AttackType = (typeof AttackType)[keyof typeof AttackType];

export const ParticipantSide = {
  ALLY: "ally",
  ENEMY: "enemy",
} as const;

export type ParticipantSide = (typeof ParticipantSide)[keyof typeof ParticipantSide];

export const CombatStatus = {
  ACTIVE: "active",
  UNCONSCIOUS: "unconscious",
  DEAD: "dead",
} as const;

export type CombatStatusType = (typeof CombatStatus)[keyof typeof CombatStatus];

export const BattleStatus = {
  PREPARED: "prepared",
  ACTIVE: "active",
  COMPLETED: "completed",
} as const;

export type BattleStatus = (typeof BattleStatus)[keyof typeof BattleStatus];

export const DM_ACTOR = { actorId: "dm", actorName: "DM", actorSide: ParticipantSide.ALLY } as const;

export const SYSTEM_ACTOR = { actorId: "system", actorName: "Система", actorSide: ParticipantSide.ALLY } as const;

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

/**
 * Глобальні константи бою
 */
export const BATTLE_CONSTANTS = {
  MIN_DAMAGE: 0,
  
  MAX_RESISTANCE: 1.0,
  
  MIN_RESISTANCE: 0,
  
  DEFAULT_RESISTANCE_PERCENT: 50,
  
  MIN_HP_PERCENT: 0,
  
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

export const BATTLE_VERSION_ONLY_PARAM = "versionOnly";

export const BATTLE_LOG_RECENT_EVENTS = 30;

export const BATTLE_LOG_PAGE_SIZE = 50;

export const BATTLE_LOG_PAGE_MAX = 100;

// відкат дозволено й для завершеного бою, тож знімки лишаються, але не всі
export const BATTLE_SNAPSHOTS_KEPT_AFTER_COMPLETE = 20;
