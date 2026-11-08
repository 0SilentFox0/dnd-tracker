import { currentOf } from "@/lib/utils/battle/common/control";
import { modeAutoSkipText } from "@/lib/utils/battle/modes/server";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { actorEvent, battleActionToEvent } from "@/lib/utils/battle/store";
import { BattleRuleError } from "@/lib/utils/battle/store/errors";
import { REJECT } from "@/lib/utils/battle/store/reject";
import { advanceTurn, assertMoraleResolved } from "@/lib/utils/battle/turn";

export const TURN_TIMER_GRACE_MS = 2000;

function assertTimerExpired(ctx: BattleMutationContext): void {
  const { enabled, seconds } = ctx.meta.rules.turnTimer;

  const startedAt = ctx.scene.turnStartedAt?.getTime();

  if (!enabled || startedAt === undefined || Date.now() - startedAt < seconds * 1000 - TURN_TIMER_GRACE_MS) throw new BattleRuleError("action_rejected", REJECT.turnTimerRunning);
}

export function nextTurnMutation(ctx: BattleMutationContext, data: { auto?: true } = {}): MutationResult {
  if (data.auto) assertTimerExpired(ctx);

  const ended = currentOf(ctx);

  const skipText = modeAutoSkipText(ctx.meta.map);

  if (ended && !ctx.isDM && !skipText && !data.auto) assertMoraleResolved(ctx, ended.basicInfo.id);

  const out = advanceTurn({ participants: ctx.participants, pending: ctx.pending, scene: ctx.scene, rng: ctx.rng, map: ctx.meta.map, rules: ctx.meta.rules });

  const events = out.actions.map(battleActionToEvent);

  const skipped = ended && skipText ? [actorEvent(ctx.scene.round, ended, skipText)] : [];

  return { participants: out.participants, pending: out.pending, scene: out.scene, events: [...skipped, ...events] };
}
