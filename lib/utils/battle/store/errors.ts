export class BattleConflictError extends Error {
  constructor(readonly currentVersion?: number) {
    super("Стан бою змінився");
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
  | "invalid_target";

export class BattleRuleError extends Error {
  constructor(
    readonly code: BattleRuleCode,
    message: string,
  ) {
    super(message);
    this.name = "BattleRuleError";
  }
}
