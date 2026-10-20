import { modeAutoSkipText } from "@/lib/utils/battle/modes/server";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { actorEvent, battleActionToEvent } from "@/lib/utils/battle/store";
import { advanceTurn } from "@/lib/utils/battle/turn";

export function nextTurnMutation(ctx: BattleMutationContext): MutationResult {
  const ended = ctx.participants[ctx.scene.turnIndex];

  const out = advanceTurn({ participants: ctx.participants, pending: ctx.pending, scene: ctx.scene, rng: ctx.rng, map: ctx.meta.map });

  const events = out.actions.map(battleActionToEvent);

  const skipText = modeAutoSkipText(ctx.meta.map);

  const skipped = ended && skipText ? [actorEvent(ctx.scene.round, ended, skipText)] : [];

  return { participants: out.participants, pending: out.pending, scene: out.scene, events: [...skipped, ...events] };
}
