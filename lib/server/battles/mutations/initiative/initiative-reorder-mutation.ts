import { z } from "zod";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { textRef } from "@/lib/i18n/text-ref";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleRuleError, dmEvent } from "@/lib/utils/battle/store";
import { reorderParticipants } from "@/lib/utils/battle/turn";

export const initiativeReorderSchema = z.object({ order: z.array(z.string().min(1)).min(1) });

export type InitiativeReorderBody = z.infer<typeof initiativeReorderSchema>;

export function initiativeReorderMutation(ctx: BattleMutationContext, body: InitiativeReorderBody): MutationResult {
  const reordered = reorderParticipants(ctx.participants, body.order);

  if (!reordered) throw new BattleRuleError("invalid_target", API_ERRORS.BATTLE_INITIATIVE_ORDER_INVALID);

  if (reordered.every((p, i) => p === ctx.participants[i])) return { participants: ctx.participants, pending: ctx.pending, events: [] };

  return { participants: reordered, pending: ctx.pending, reordered: true, events: [dmEvent(ctx.scene.round, textRef("battleLog.dm.initiativeReordered"))] };
}
