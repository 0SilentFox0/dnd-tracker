import { z } from "zod";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { findParticipant, updateParticipant } from "@/lib/utils/abilities/engine/participants";
import { runAbilities } from "@/lib/utils/abilities/engine/run-abilities";
import { withinLimits } from "@/lib/utils/abilities/engine/usage";
import { applyMainActionUsed } from "@/lib/utils/battle/participant";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleAccessError, BattleRuleError } from "@/lib/utils/battle/store";
import { assertNotPanicking } from "@/lib/utils/battle/turn";
import { assertAbilityTargets } from "@/lib/utils/battle/validation/ability-targets";

export const abilityActionSchema = z.object({
  participantId: z.string(),
  abilityKey: z.string(),
  targetParticipantIds: z.array(z.string()).optional(),
});

export type AbilityActionBody = z.infer<typeof abilityActionSchema>;

export function abilityActionMutation(ctx: BattleMutationContext, data: AbilityActionBody): MutationResult {
  const participant = findParticipant(ctx.participants, data.participantId);

  if (!participant) throw new BattleAccessError(404, "Учасника немає в бою");

  if (!ctx.isDM && participant.basicInfo.controlledBy !== ctx.userId) throw new BattleAccessError(403, API_ERRORS.FORBIDDEN);

  assertNotPanicking(ctx.scene.pendingMoraleCheck, participant.basicInfo.id);

  const ability = (participant.battleData.resolvedAbilities ?? []).find((a) => a.key === data.abilityKey && a.trigger.event === "action");

  if (!ability) throw new BattleRuleError("action_rejected", "У учасника немає такого вміння");

  if (participant.actionFlags.hasUsedAction) throw new BattleRuleError("action_used", "Дію вже використано цього ходу");

  if (!withinLimits(participant, ability)) throw new BattleRuleError("ability_limit", "Ліміт використань вичерпано");

  const targetIds = assertAbilityTargets(ability, ctx.participants, data.targetParticipantIds ?? []);

  const run = runAbilities(
    ctx.participants,
    { type: "action", actorId: participant.basicInfo.id, abilityKey: ability.key, targetIds },
    { round: ctx.scene.round, rng: Math.random },
  );

  const participants = updateParticipant(run.participants, participant.basicInfo.id, applyMainActionUsed);

  const text = run.fired.length ? run.messages.join(" | ") : `${ability.name}: не спрацювало`;

  return {
    participants,
    pending: ctx.pending,
    events: [
      {
        type: "ability",
        round: ctx.scene.round,
        actorId: participant.basicInfo.id,
        resultText: text || ability.name,
        details: { actorName: participant.basicInfo.name, actorSide: participant.basicInfo.side, actionDetails: { abilityKey: ability.key, skillName: ability.name } },
      },
    ],
  };
}
