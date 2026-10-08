import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { battleActionToEvent } from "@/lib/utils/battle/store";
import { advanceTurn } from "@/lib/utils/battle/turn";

export function nextTurnMutation(ctx: BattleMutationContext): MutationResult {
  const out = advanceTurn({ participants: ctx.participants, pending: ctx.pending, scene: ctx.scene, rng: ctx.rng });

  return { participants: out.participants, pending: out.pending, scene: out.scene, events: out.actions.map(battleActionToEvent) };
}
