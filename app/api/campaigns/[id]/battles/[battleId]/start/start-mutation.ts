import { buildStartOrder } from "./start-battle-handler";

import { BattleStatus } from "@/lib/constants/battle";
import { modeStart } from "@/lib/utils/battle/modes/server";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { battleActionToEvent, BattleRuleError } from "@/lib/utils/battle/store";

export function createStartMutation(build = buildStartOrder) {
  return async (ctx: BattleMutationContext): Promise<MutationResult> => {
    if (ctx.meta.setup.length === 0) {
      throw new BattleRuleError("invalid_target", "Немає учасників для бою");
    }

    const { order, reserve, triggerLogEntries } = await build(ctx.scene.id, ctx.scene.campaignId, ctx.meta.setup, ctx.meta.map);

    if (order.length === 0) {
      throw new BattleRuleError("invalid_target", "Хоча б один учасник має бути на полі");
    }

    const map = ctx.meta.map;

    const started = modeStart(map, order);

    const participants = started?.participants ?? order;

    const turnIndex = started?.turnIndex ?? 0;

    return {
      participants,
      pending: reserve,
      scene: { status: BattleStatus.ACTIVE, startedAt: new Date(), completedAt: null, round: 1, turnIndex, pendingMoraleCheck: null },
      events: triggerLogEntries.map(battleActionToEvent),
      history: { clear: true },
    };
  };
}
