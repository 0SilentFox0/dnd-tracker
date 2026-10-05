import { z } from "zod";

import { runAttackPhase } from "@/lib/utils/battle/attack-and-next-turn/run-attack-phase";
import { toPipelineError } from "@/lib/utils/battle/pipeline/compat-errors";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { battleActionToEvent, systemEvent } from "@/lib/utils/battle/store";
import { advanceTurn } from "@/lib/utils/battle/turn";
import { executeComplexTriggersForChangedParticipant } from "@/lib/utils/skills/execution/simple";

export const attackBodySchema = z
  .object({
    attackerId: z.string(),
    targetId: z.string().optional(),
    targetIds: z.array(z.string()).optional(),
    attackId: z.string().optional(),
    d20Roll: z.number().min(1).max(20).optional(),
    attackRoll: z.number().min(1).max(20).optional(),
    attackRolls: z.array(z.number().min(1).max(20)).optional(),
    advantageRoll: z.number().min(1).max(20).optional(),
    disadvantageRoll: z.number().min(1).max(20).optional(),
    damageRolls: z.array(z.number()).default([]),
    reactionDamage: z.number().min(0).optional(),
    endTurn: z.boolean().default(false),
  })
  .refine(
    (d) => d.d20Roll !== undefined || d.attackRoll !== undefined || (Array.isArray(d.attackRolls) && d.attackRolls.length > 0),
    { message: "d20Roll, attackRoll або attackRolls обов'язковий", path: ["d20Roll"] },
  )
  .refine((d) => d.targetId !== undefined || (d.targetIds !== undefined && d.targetIds.length > 0), {
    message: "Потрібно вказати хоча б одну ціль",
    path: ["targetIds"],
  });

export type AttackBody = z.infer<typeof attackBodySchema>;

export function attackMutation(ctx: BattleMutationContext, body: AttackBody): MutationResult {
  const { endTurn, ...data } = body;

  let phase: ReturnType<typeof runAttackPhase>;

  try {
    phase = runAttackPhase({
      battle: { initiativeOrder: ctx.participants, battleLog: [], currentRound: ctx.scene.round, currentTurnIndex: ctx.scene.turnIndex },
      data,
      battleId: ctx.scene.id,
      userId: ctx.userId,
      isDM: ctx.isDM,
    });
  } catch (e) {
    toPipelineError(e);
  }

  let order = phase.finalInitiativeOrder;

  const events = phase.allBattleActions.map(battleActionToEvent);

  const changedIds = new Set(
    phase.allBattleActions.flatMap((a) => a.hpChanges.filter((h) => h.oldHp !== h.newHp).map((h) => h.participantId)),
  );

  const messages: string[] = [];

  for (const id of changedIds) {
    const triggered = executeComplexTriggersForChangedParticipant(order, id, ctx.scene.round);

    order = triggered.updatedParticipants;
    messages.push(...triggered.messages);
  }

  if (messages.length > 0) {
    events.push(systemEvent(ctx.scene.round, `Тригери після зміни HP: ${messages.join("; ")}`));
  }

  if (!endTurn) return { participants: order, pending: ctx.pending, events };

  const advanced = advanceTurn({ participants: order, pending: ctx.pending, scene: ctx.scene });

  return {
    participants: advanced.participants,
    pending: advanced.pending,
    scene: advanced.scene,
    events: [...events, ...advanced.actions.map(battleActionToEvent)],
  };
}
