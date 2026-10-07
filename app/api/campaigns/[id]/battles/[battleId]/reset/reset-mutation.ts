import { BattleStatus } from "@/lib/constants/battle";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";

export function resetMutation(ctx: BattleMutationContext): MutationResult {
  void ctx;

  return {
    participants: [],
    pending: [],
    scene: { status: BattleStatus.PREPARED, round: 1, turnIndex: 0, pendingMoraleCheck: null, startedAt: null, completedAt: null },
    events: [],
    history: { clear: true },
  };
}
