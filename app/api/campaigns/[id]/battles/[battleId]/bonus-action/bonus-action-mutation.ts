import { z } from "zod";

import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleAccessError, BattleRuleError } from "@/lib/utils/battle/store";
import { executeBonusActionSkill } from "@/lib/utils/skills/execution";

export const bonusActionSchema = z.object({
  participantId: z.string(),
  skillId: z.string(),
  targetParticipantId: z.string().optional(),
});

export type BonusActionBody = z.infer<typeof bonusActionSchema>;

export function bonusActionMutation(ctx: BattleMutationContext, data: BonusActionBody): MutationResult {
  const participant = ctx.participants.find((p) => p.basicInfo.id === data.participantId);

  if (!participant) throw new BattleAccessError(404, "Учасника немає в бою");

  if (!ctx.isDM && participant.basicInfo.controlledBy !== ctx.userId) {
    throw new BattleAccessError(403, "Forbidden");
  }

  const skill = participant.battleData.activeSkills?.find((s) => s.skillId === data.skillId);

  if (!skill) throw new BattleRuleError("action_rejected", "У учасника немає такого скіла");

  if (participant.actionFlags.hasUsedBonusAction) {
    throw new BattleRuleError("action_used", "Бонусну дію вже використано цього ходу");
  }

  const skillUsageCounts = { ...participant.battleData.skillUsageCounts };

  const result = executeBonusActionSkill(
    participant,
    skill,
    ctx.participants,
    ctx.scene.round,
    data.targetParticipantId,
    skillUsageCounts,
  );

  const participants = result.updatedParticipants.map((p) =>
    p.basicInfo.id === participant.basicInfo.id
      ? { ...p, battleData: { ...p.battleData, skillUsageCounts } }
      : p,
  );

  return {
    participants,
    pending: ctx.pending,
    events: [
      {
        type: "ability",
        round: ctx.scene.round,
        actorId: participant.basicInfo.id,
        resultText: result.messages.join(" | "),
        details: {
          actorName: participant.basicInfo.name,
          actorSide: participant.basicInfo.side,
          actionDetails: { skillId: data.skillId, skillName: skill.name },
        },
      },
    ],
  };
}
