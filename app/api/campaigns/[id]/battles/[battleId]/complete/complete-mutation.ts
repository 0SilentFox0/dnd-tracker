import { z } from "zod";

import { BattleStatus } from "@/lib/constants/battle";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { battleActionToEvent } from "@/lib/utils/battle/store";
import { checkVictoryConditions, completeBattle } from "@/lib/utils/battle/turn/victory";

export const completeBattleSchema = z.object({ result: z.enum(["victory", "defeat"]).optional() });

export function completeMutation(ctx: BattleMutationContext, body: z.infer<typeof completeBattleSchema>): MutationResult {
  const result = body.result ?? checkVictoryConditions(ctx.participants).result ?? "victory";

  const { updatedParticipants, battleAction } = completeBattle(ctx.participants, result, ctx.scene.round, ctx.meta.rules);

  return {
    participants: updatedParticipants,
    pending: ctx.pending,
    scene: { status: BattleStatus.COMPLETED, completedAt: new Date() },
    events: [battleActionToEvent(battleAction)],
  };
}
