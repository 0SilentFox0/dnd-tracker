import { currentOf } from "@/lib/utils/battle/common/control";
import { modeAutoSkipText } from "@/lib/utils/battle/modes/server";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { actorEvent, battleActionToEvent } from "@/lib/utils/battle/store";
import { advanceTurn, assertMoraleResolved } from "@/lib/utils/battle/turn";

export function nextTurnMutation(ctx: BattleMutationContext): MutationResult {
  const ended = currentOf(ctx);

  const skipText = modeAutoSkipText(ctx.meta.map);

  if (ended && !ctx.isDM && !skipText) assertMoraleResolved(ctx, ended.basicInfo.id);

  const out = advanceTurn({ participants: ctx.participants, pending: ctx.pending, scene: ctx.scene, rng: ctx.rng, map: ctx.meta.map, rules: ctx.meta.rules });

  const events = out.actions.map(battleActionToEvent);

  const skipped = ended && skipText ? [actorEvent(ctx.scene.round, ended, skipText)] : [];

  return { participants: out.participants, pending: out.pending, scene: out.scene, events: [...skipped, ...events] };
}
