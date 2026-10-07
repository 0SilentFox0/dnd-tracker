import { z } from "zod";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { isActive, updateParticipant } from "@/lib/utils/abilities/engine/participants";
import { runAbilities } from "@/lib/utils/abilities/engine/run-abilities";
import { withinLimits } from "@/lib/utils/abilities/engine/usage";
import { conditionRequiresDeadTarget } from "@/lib/utils/abilities/registry/conditions";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleAccessError, BattleRuleError } from "@/lib/utils/battle/store";
import { assertNotPanicking } from "@/lib/utils/battle/turn";

export const bonusActionSchema = z.object({
  participantId: z.string(),
  abilityKey: z.string(),
  targetParticipantId: z.string().optional(),
});

export type BonusActionBody = z.infer<typeof bonusActionSchema>;

export function bonusActionMutation(ctx: BattleMutationContext, data: BonusActionBody): MutationResult {
  const participant = ctx.participants.find((p) => p.basicInfo.id === data.participantId);

  if (!participant) throw new BattleAccessError(404, "Учасника немає в бою");

  if (!ctx.isDM && participant.basicInfo.controlledBy !== ctx.userId) throw new BattleAccessError(403, API_ERRORS.FORBIDDEN);

  assertNotPanicking(ctx.scene.pendingMoraleCheck, participant.basicInfo.id);

  const ability = (participant.battleData.resolvedAbilities ?? []).find((a) => a.key === data.abilityKey && a.trigger.event === "bonusAction");

  if (!ability) throw new BattleRuleError("action_rejected", "У учасника немає такого вміння");

  if (participant.actionFlags.hasUsedBonusAction) throw new BattleRuleError("action_used", "Бонусну дію вже використано цього ходу");

  if (!withinLimits(participant, ability)) throw new BattleRuleError("ability_limit", "Ліміт використань вичерпано");

  if (conditionRequiresDeadTarget(ability.condition)) {
    const target = ctx.participants.find((p) => p.basicInfo.id === data.targetParticipantId);

    if (!target || isActive(target)) throw new BattleRuleError("invalid_target", API_ERRORS.BONUS_TARGET_MUST_BE_DEAD);
  }

  const run = runAbilities(
    ctx.participants,
    { type: "bonusAction", actorId: participant.basicInfo.id, abilityKey: ability.key, targetId: data.targetParticipantId },
    { round: ctx.scene.round, rng: Math.random },
  );

  const participants = updateParticipant(run.participants, participant.basicInfo.id, (p) => ({ ...p, actionFlags: { ...p.actionFlags, hasUsedBonusAction: true } }));

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
