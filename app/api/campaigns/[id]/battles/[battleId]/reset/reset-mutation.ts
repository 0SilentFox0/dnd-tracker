import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";

export function resetMutation(ctx: BattleMutationContext): MutationResult {
  void ctx;

  return {
    participants: [],
    pending: [],
    scene: { status: "prepared", round: 1, turnIndex: 0, pendingMoraleCheck: null, startedAt: null, completedAt: null },
    events: [],
    history: { clear: true },
  };
}
