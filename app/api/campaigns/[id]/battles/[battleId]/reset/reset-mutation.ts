import { BattleStatus } from "@/lib/constants/battle";
import { pruneExpiredBarriers } from "@/lib/utils/battle/grid/terrain";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";

export function resetMutation(ctx: BattleMutationContext): MutationResult {
  const map = ctx.meta.map ? pruneExpiredBarriers(ctx.meta.map, Number.POSITIVE_INFINITY) : null;

  return {
    participants: [],
    pending: [],
    scene: {
      status: BattleStatus.PREPARED,
      round: 1,
      turnIndex: 0,
      pendingMoraleCheck: null,
      startedAt: null,
      completedAt: null,
      ...(map && { map }),
    },
    events: [],
    history: { clear: true },
  };
}
