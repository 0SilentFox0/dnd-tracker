import { buildStartOrder } from "./start-battle-handler";

import { BattleStatus, ParticipantSide } from "@/lib/constants/battle";
import { takesTurn } from "@/lib/utils/abilities/engine/core/participants";
import { inwardFacing } from "@/lib/utils/battle/maze";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { battleActionToEvent, BattleRuleError } from "@/lib/utils/battle/store";
import type { BattleMapConfig, BattleParticipant } from "@/types/battle";

// вороги вже сплячі з buildStartOrder; герої дивляться всередину лабіринту
function faceInward(map: BattleMapConfig, order: BattleParticipant[]): BattleParticipant[] {
  return order.map((p) => {
    const at = p.battleData.position;

    return at && p.basicInfo.side !== ParticipantSide.ENEMY ? { ...p, battleData: { ...p.battleData, facing: inwardFacing(map, at) } } : p;
  });
}

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

    const participants = map?.maze ? faceInward(map, order) : order;

    const turnIndex = map?.maze ? Math.max(0, participants.findIndex((p) => takesTurn(p, 1))) : 0;

    return {
      participants,
      pending: reserve,
      scene: { status: BattleStatus.ACTIVE, startedAt: new Date(), completedAt: null, round: 1, turnIndex, pendingMoraleCheck: null },
      events: triggerLogEntries.map(battleActionToEvent),
      history: { clear: true },
    };
  };
}
