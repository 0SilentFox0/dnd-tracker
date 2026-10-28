import { BattleStatus } from "@/lib/constants/battle";
import { pruneExpiredTerrain } from "@/lib/utils/battle/grid/terrain";
import { modeReset } from "@/lib/utils/battle/modes/server";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";

export function resetMutation(ctx: BattleMutationContext): MutationResult {
  const pruned = ctx.meta.map ? pruneExpiredTerrain(ctx.meta.map, Number.POSITIVE_INFINITY) : null;

  const map = pruned ? modeReset(pruned) : null;

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
