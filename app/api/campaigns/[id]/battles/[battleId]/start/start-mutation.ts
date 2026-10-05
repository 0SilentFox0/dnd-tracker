import { buildStartOrder } from "./start-battle-handler";

import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { battleActionToEvent, BattleRuleError } from "@/lib/utils/battle/store";

export function createStartMutation(build = buildStartOrder) {
  return async (ctx: BattleMutationContext): Promise<MutationResult> => {
    if (ctx.meta.setup.length === 0) {
      throw new BattleRuleError("invalid_target", "Немає учасників для бою");
    }

    const { order, triggerLogEntries } = await build(ctx.scene.id, ctx.scene.campaignId, ctx.meta.setup);

    return {
      participants: order,
      pending: [],
      scene: { status: "active", startedAt: new Date(), completedAt: null, round: 1, turnIndex: 0, pendingMoraleCheck: null },
      events: triggerLogEntries.map(battleActionToEvent),
      history: { clear: true },
    };
  };
}
