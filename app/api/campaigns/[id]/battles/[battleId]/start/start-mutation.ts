import { buildStartOrder } from "./start-battle-handler";

import { BattleStatus } from "@/lib/constants/battle";
import { assignUnitControl } from "@/lib/utils/battle/participant/unit-control";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { battleActionToEvent, BattleRuleError } from "@/lib/utils/battle/store";

export function createStartMutation(build = buildStartOrder) {
  return async (ctx: BattleMutationContext): Promise<MutationResult> => {
    if (ctx.meta.setup.length === 0) {
      throw new BattleRuleError("invalid_target", "Немає учасників для бою");
    }

    const { order, reserve, triggerLogEntries } = await build(ctx.scene.id, ctx.scene.campaignId, ctx.meta.setup);

    return {
      participants: assignUnitControl(order, ctx.userId),
      pending: reserve,
      scene: { status: BattleStatus.ACTIVE, startedAt: new Date(), completedAt: null, round: 1, turnIndex: 0, pendingMoraleCheck: null },
      events: triggerLogEntries.map(battleActionToEvent),
      history: { clear: true },
    };
  };
}
