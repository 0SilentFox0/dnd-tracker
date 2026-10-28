import { API_ERRORS, type ErrorParams } from "@/lib/constants/api-errors";

export class BattleConflictError extends Error {
  constructor(readonly currentVersion?: number) {
    super(API_ERRORS.BATTLE_STATE_CHANGED);
    this.name = "BattleConflictError";
  }
}

export class BattleAccessError extends Error {
  constructor(
    readonly status: 401 | 403 | 404,
    message: string,
  ) {
    super(message);
    this.name = "BattleAccessError";
  }
}

export type BattleRuleCode =
  | "not_your_turn"
  | "wrong_status"
  | "participant_dead"
  | "invalid_dice"
  | "action_used"
  | "invalid_target"
  | "action_rejected"
  | "ability_limit"
  | "awaiting_dm"
  | "crit_pending";

export class BattleRuleError extends Error {
  constructor(
    readonly code: BattleRuleCode,
    message: string,
    readonly params?: ErrorParams,
  ) {
    super(message);
    this.name = "BattleRuleError";
  }
}

export function rejectAction(message: string): never {
  throw new BattleRuleError("action_rejected", message);
}
