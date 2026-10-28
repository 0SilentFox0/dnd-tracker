import { z } from "zod";

import { ABILITY_KEYS } from "@/lib/constants/abilities";
import { API_ERRORS, conditionAbsentMessage, conditionImmuneMessage } from "@/lib/constants/api-errors";
import { CONDITION_LIMITS } from "@/lib/constants/battle";
import { findParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { CustomConditionKeySchema } from "@/lib/utils/abilities/schema";
import { applyCondition5e, CONDITION_5E_KEYS, MAX_EXHAUSTION, PERMANENT_ROUNDS, removeCondition5e } from "@/lib/utils/battle/conditions";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleRuleError, dmEvent } from "@/lib/utils/battle/store";

const ConditionKeySchema = z.union([z.enum(CONDITION_5E_KEYS), CustomConditionKeySchema]);

export const battleConditionsSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("apply"),
    participantId: z.string().min(1),
    condition: ConditionKeySchema,
    rounds: z.number().int().min(1).max(CONDITION_LIMITS.rounds).optional(),
    levels: z.number().int().min(1).max(MAX_EXHAUSTION).optional(),
    saveEnds: z.object({ ability: z.enum(ABILITY_KEYS), dc: z.number().int().min(1).max(CONDITION_LIMITS.dc) }).optional(),
  }),
  z.object({ action: z.literal("remove"), participantId: z.string().min(1), condition: ConditionKeySchema }),
]);

export type BattleConditionsBody = z.infer<typeof battleConditionsSchema>;

export function battleConditionsMutation(ctx: BattleMutationContext, body: BattleConditionsBody): MutationResult {
  const target = findParticipant(ctx.participants, body.participantId);

  if (!target) throw new BattleRuleError("invalid_target", API_ERRORS.MEMBER_NOT_FOUND);

  const round = ctx.scene.round;

  const targets = [{ participantId: target.basicInfo.id, participantName: target.basicInfo.name }];

  if (body.action === "apply") {
    const result = applyCondition5e(ctx.participants, body.participantId, {
      key: body.condition,
      rounds: body.rounds ?? PERMANENT_ROUNDS,
      permanent: !body.rounds,
      levels: body.levels,
      saveEnds: body.saveEnds,
      source: undefined,
      sourceName: "ДМ",
      timedKey: `dm:${body.condition}@${round}`,
      round,
      rules: ctx.meta.rules,
    });

    if (result.blocked) throw new BattleRuleError("invalid_target", conditionImmuneMessage(target.basicInfo.name));

    return { participants: result.participants, pending: ctx.pending, events: [dmEvent(round, result.messages.join("; "), targets)] };
  }

  const { participants, removed } = removeCondition5e(ctx.participants, body.participantId, body.condition);

  if (removed.length === 0) throw new BattleRuleError("invalid_target", conditionAbsentMessage(target.basicInfo.name));

  return { participants, pending: ctx.pending, events: [dmEvent(round, `ДМ: ${target.basicInfo.name} — стан знято: ${removed[0].name}`, targets)] };
}
