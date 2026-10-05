import { BattleAccessError, BattleRuleError } from "@/lib/utils/battle/store";

export function toPipelineError(err: unknown): never {
  const status = (err as { status?: unknown })?.status;

  if (err instanceof Error && typeof status === "number") {
    if (status === 403 || status === 404) throw new BattleAccessError(status, err.message);

    throw new BattleRuleError("action_rejected", err.message);
  }

  throw err;
}
