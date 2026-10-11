import { z } from "zod";

import { DM_ACTOR } from "@/lib/constants/battle";
import { LIVE_SCALE_STEP } from "@/lib/constants/battle-balance";
import { liveScaleEnemyUnits } from "@/lib/utils/battle/balance";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleRuleError } from "@/lib/utils/battle/store";

export const scaleUnitsSchema = z.object({ direction: z.enum(["buff", "debuff"]) });

export function scaleUnitsMutation(ctx: BattleMutationContext, body: z.infer<typeof scaleUnitsSchema>): MutationResult {
  const { participants, scaled } = liveScaleEnemyUnits(ctx.participants, body.direction);

  if (scaled.length === 0) throw new BattleRuleError("action_rejected", "Немає живих ворожих юнітів");

  const pct = Math.round((LIVE_SCALE_STEP - 1) * 100);

  const label = body.direction === "buff" ? `Підсилення ворожих юнітів (DM): HP і шкода ×${LIVE_SCALE_STEP}` : `Послаблення ворожих юнітів (DM): HP і шкода ÷${LIVE_SCALE_STEP}`;

  return {
    participants,
    pending: ctx.pending,
    events: [
      {
        type: "ability",
        round: ctx.scene.round,
        actorId: DM_ACTOR.actorId,
        resultText: `${label} (~${pct}%) — ${scaled.join(", ")}`,
        details: { actorName: DM_ACTOR.actorName, actorSide: DM_ACTOR.actorSide, actionDetails: {} },
      },
    ],
  };
}
