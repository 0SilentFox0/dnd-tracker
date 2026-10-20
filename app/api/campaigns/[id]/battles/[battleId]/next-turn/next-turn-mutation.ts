import { MAZE_TEXTS } from "@/lib/constants/maze-texts";
import { isMazeDark } from "@/lib/utils/battle/modes/maze";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { actorEvent, battleActionToEvent } from "@/lib/utils/battle/store";
import { advanceTurn } from "@/lib/utils/battle/turn";

export function nextTurnMutation(ctx: BattleMutationContext): MutationResult {
  const ended = ctx.participants[ctx.scene.turnIndex];

  const out = advanceTurn({ participants: ctx.participants, pending: ctx.pending, scene: ctx.scene, rng: ctx.rng, map: ctx.meta.map });

  const events = out.actions.map(battleActionToEvent);

  const skipped = ended && isMazeDark(ctx.meta.map) ? [actorEvent(ctx.scene.round, ended, MAZE_TEXTS.darkSkip)] : [];

  return { participants: out.participants, pending: out.pending, scene: out.scene, events: [...skipped, ...events] };
}
