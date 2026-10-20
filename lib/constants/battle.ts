import type { BattleMapConfig, MazeConfig, MazeDifficulty } from "@/types/battle";

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

export const BATTLE_ACTION_LABELS: Record<(typeof BattleActionType)[keyof typeof BattleActionType], string> = {
  attack: "атака",
  spell: "заклинання",
  bonus_action: "бонусна дія",
  ability: "вміння",
  end_turn: "кінець ходу",
  skip_turn: "пропуск ходу",
  morale_skip: "мораль",
  retaliation: "відсіч",
};

export const ATTACK_KIND_LABELS: Record<AttackType, string> = {
  melee: "Ближня",
  ranged: "Дальня",
};

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

export const CELL_FEET = 5;

export const FIRE_WAVE_NO_MAP_VICTIMS = 2;

export const AURA_RADIUS_CELLS = 2;

// одиночні заклинання, розширені вмінням (spellTargeting area), на карті наводяться колом; «all» б'є всю сторону
export const SKILL_AREA_RADIUS_FEET = 10;

export const DEFAULT_MAP_BACKGROUND = "/battle-maps/nicolas-tomb.webp";

export const DEFAULT_HAZARD_LABEL = "Небезпечна зона";

export const DEFAULT_HAZARD_DICE = "1d6";

export const DEFAULT_HAZARD_DAMAGE_TYPE = "fire";

export const HAZARD_DICE_PATTERN = /^\d{1,2}d\d{1,3}([+-]\d{1,3})?$/;

export const DEFAULT_BATTLE_MAP = {
  cols: 20,
  rows: 12,
  background: null,
  opacity: 0.35,
} as const satisfies BattleMapConfig;

export const MAZE_STEPS_PER_TURN = 3;

export const MAZE_VISION_RANGE = 4;

export const MAZE_TELEPORT_MIN_DISTANCE = 5;

export const MAZE_SCATTER_MIN_GAP = 2;

export const MAZE_MAX_GENERATION_ATTEMPTS = 50;

export const MAZE_DIFFICULTIES = ["easy", "medium", "hard"] as const;

export const MAZE_MARK_SYMBOLS = ["arrow-n", "arrow-e", "arrow-s", "arrow-w", "cross", "skull", "star"] as const;

export const MAZE_LIMITS = { wallEdgesPerOp: 400, fogCellsPerOp: 400, teleportPairs: 10, fogPatches: 20 } as const;

export const MAZE_MARK_COLORS: string[] = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#a855f7", "#ec4899"];

export function emptyMaze(difficulty: MazeDifficulty = "medium"): MazeConfig {
  return { walls: [], exit: null, difficulty, teleports: [], fog: [], marks: {}, dark: false };
}
