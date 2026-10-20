import { heroEvent, isMazeDark, MAZE_DARK_SKIP } from "@/lib/utils/battle/maze";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { battleActionToEvent } from "@/lib/utils/battle/store";
import { advanceTurn } from "@/lib/utils/battle/turn";

export function nextTurnMutation(ctx: BattleMutationContext): MutationResult {
  const ended = ctx.participants[ctx.scene.turnIndex];

  const out = advanceTurn({ participants: ctx.participants, pending: ctx.pending, scene: ctx.scene, rng: ctx.rng, map: ctx.meta.map });

  const events = out.actions.map(battleActionToEvent);

  const skipped = ended && isMazeDark(ctx.meta.map) ? [heroEvent(ctx.scene.round, ended, MAZE_DARK_SKIP)] : [];

  return { participants: out.participants, pending: out.pending, scene: out.scene, events: [...skipped, ...events] };
}
