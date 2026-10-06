import { z } from "zod";

import { runAttackPhase } from "@/lib/utils/battle/attack-and-next-turn/run-attack-phase";
import { heroAttackDamageParts } from "@/lib/utils/battle/damage/hero-damage";
import { toPipelineError } from "@/lib/utils/battle/pipeline/compat-errors";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { battleActionToEvent } from "@/lib/utils/battle/store";
import { advanceTurn } from "@/lib/utils/battle/turn";
import { assertAttackRolls } from "@/lib/utils/battle/validation/dice-checks";

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

// атака шукається так само, як у runAttackPhase; якщо її немає — помилку дасть сама фаза атаки
function assertAttackInput(ctx: BattleMutationContext, data: Omit<AttackBody, "endTurn">): void {
  const attacker = ctx.participants.find((p) => p.basicInfo.id === data.attackerId);

  const attack = data.attackId
    ? attacker?.battleData.attacks.find((a) => a.id === data.attackId || a.name === data.attackId)
    : attacker?.battleData.attacks[0];

  if (!attacker || !attack) return;

  const targetIds = data.targetIds?.length ? data.targetIds : data.targetId ? [data.targetId] : [];

  // клієнт героя кидає кубики зброї разом із кубиками рівня (PlayerTurnViewDialogs)
  assertAttackRolls(heroAttackDamageParts(attacker, attack).formula, { damageRolls: data.damageRolls, targetCount: targetIds.length });
}

export function attackMutation(ctx: BattleMutationContext, body: AttackBody): MutationResult {
  const { endTurn, ...data } = body;

  assertAttackInput(ctx, data);

  let phase: ReturnType<typeof runAttackPhase>;

  try {
    phase = runAttackPhase({
      battle: { initiativeOrder: ctx.participants, battleLog: [], currentRound: ctx.scene.round, currentTurnIndex: ctx.scene.turnIndex },
      data,
      battleId: ctx.scene.id,
      userId: ctx.userId,
      isDM: ctx.isDM,
      rng: ctx.rng,
    });
  } catch (e) {
    toPipelineError(e);
  }

  const order = phase.finalInitiativeOrder;

  const events = phase.allBattleActions.map(battleActionToEvent);

  if (!endTurn) return { participants: order, pending: ctx.pending, events };

  const advanced = advanceTurn({ participants: order, pending: ctx.pending, scene: ctx.scene });

  return {
    participants: advanced.participants,
    pending: advanced.pending,
    scene: advanced.scene,
    events: [...events, ...advanced.actions.map(battleActionToEvent)],
  };
}
