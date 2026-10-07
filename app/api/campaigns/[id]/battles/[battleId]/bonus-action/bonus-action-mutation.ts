import { z } from "zod";

import { getCachedSummonPool } from "@/lib/cache/reference-data";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { updateParticipant } from "@/lib/utils/abilities/engine/participants";
import { runAbilities } from "@/lib/utils/abilities/engine/run-abilities";
import { withinLimits } from "@/lib/utils/abilities/engine/usage";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleAccessError, BattleRuleError } from "@/lib/utils/battle/store";
import { applyAbilitySummons, type SummonDeps } from "@/lib/utils/battle/summon/ability-summons";
import { assertNotPanicking } from "@/lib/utils/battle/turn";
import { assertAbilityTargets } from "@/lib/utils/battle/validation/ability-targets";

export const bonusActionSchema = z.object({
  participantId: z.string(),
  abilityKey: z.string(),
  targetParticipantId: z.string().optional(),
  targetParticipantIds: z.array(z.string()).optional(),
});

export type BonusActionBody = z.infer<typeof bonusActionSchema>;

const defaultDeps: SummonDeps = { loadPool: getCachedSummonPool };

export function createBonusActionMutation(deps: SummonDeps = defaultDeps) {
  return async (ctx: BattleMutationContext, data: BonusActionBody): Promise<MutationResult> => {
  const participant = ctx.participants.find((p) => p.basicInfo.id === data.participantId);

  if (!participant) throw new BattleAccessError(404, "Учасника немає в бою");

  if (!ctx.isDM && participant.basicInfo.controlledBy !== ctx.userId) throw new BattleAccessError(403, API_ERRORS.FORBIDDEN);

  assertNotPanicking(ctx.scene.pendingMoraleCheck, participant.basicInfo.id);

  const ability = (participant.battleData.resolvedAbilities ?? []).find((a) => a.key === data.abilityKey && a.trigger.event === "bonusAction");

  if (!ability) throw new BattleRuleError("action_rejected", "У учасника немає такого вміння");

  if (participant.actionFlags.hasUsedBonusAction) throw new BattleRuleError("action_used", "Бонусну дію вже використано цього ходу");

  if (!withinLimits(participant, ability)) throw new BattleRuleError("ability_limit", "Ліміт використань вичерпано");

  const targetIds = assertAbilityTargets(ability, ctx.participants, data.targetParticipantIds ?? (data.targetParticipantId ? [data.targetParticipantId] : []));

  const run = runAbilities(
    ctx.participants,
    { type: "bonusAction", actorId: participant.basicInfo.id, abilityKey: ability.key, targetIds },
    { round: ctx.scene.round, rng: Math.random },
  );

  const summoned = await applyAbilitySummons(run.summons, run.participants, { campaignId: ctx.scene.campaignId, battleId: ctx.scene.id, rng: Math.random, deps });

  const participants = updateParticipant(summoned.order, participant.basicInfo.id, (p) => ({ ...p, actionFlags: { ...p.actionFlags, hasUsedBonusAction: true } }));

  const text = run.fired.length ? [...run.messages, ...summoned.messages].join(" | ") : `${ability.name}: не спрацювало`;

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
  };
}

export const bonusActionMutation = createBonusActionMutation();
