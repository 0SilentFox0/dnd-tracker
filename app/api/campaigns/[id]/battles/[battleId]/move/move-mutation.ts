import { z } from "zod";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { findParticipant, isActive, replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { canActNow } from "@/lib/utils/battle/common/control";
import { canStand, cellKey, placeParticipants, reachable, remainingMovement } from "@/lib/utils/battle/grid";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleAccessError, BattleRuleError } from "@/lib/utils/battle/store";
import { assertNotPanicking } from "@/lib/utils/battle/turn";

export const moveSchema = z.object({
  participantId: z.string(),
  to: z.object({ x: z.number().int().min(0), y: z.number().int().min(0) }),
  free: z.boolean().optional(),
});

export type MoveBody = z.infer<typeof moveSchema>;

export function moveMutation(ctx: BattleMutationContext, data: MoveBody): MutationResult {
  const map = ctx.meta.map;

  if (!map) throw new BattleRuleError("action_rejected", "У цьому бою немає карти");

  const found = findParticipant(ctx.participants, data.participantId);

  if (!found) throw new BattleAccessError(404, "Учасника немає в бою");

  const participants = found.battleData.position ? ctx.participants : placeParticipants(map, ctx.participants);

  const mover = findParticipant(participants, data.participantId) ?? found;

  if (!isActive(mover) || mover.battleData.reserved) throw new BattleRuleError("participant_dead", "Учасник не може рухатися");

  const current = ctx.participants[ctx.scene.turnIndex];

  const ownTurn = current?.basicInfo.id === mover.basicInfo.id;

  if (!ownTurn && !ctx.isDM) throw new BattleAccessError(403, "Рухатися можна лише у свій хід");

  if (ownTurn && !canActNow(ctx, mover, current)) throw new BattleAccessError(403, API_ERRORS.FORBIDDEN);

  let movementUsed = mover.battleData.movementUsed;

  // розстановка ДМ (чужий хід або free) — без бюджету й шляху
  const placement = !ownTurn || (ctx.isDM && data.free === true);

  if (!placement) {
    assertNotPanicking(ctx.scene.pendingMoraleCheck, mover.basicInfo.id);

    const cost = reachable(map, participants, mover, remainingMovement(mover)).get(cellKey(data.to));

    if (cost === undefined) throw new BattleRuleError("action_rejected", "Туди не дійти: зайнято, закрито ворогами або не вистачає руху");

    movementUsed = (movementUsed ?? 0) + cost;
  } else if (!canStand(map, participants, mover, data.to)) {
    throw new BattleRuleError("action_rejected", "Клітинка зайнята або поза картою");
  }

  const moved = { ...mover, battleData: { ...mover.battleData, position: data.to, ...(movementUsed !== undefined && { movementUsed }) } };

  return { participants: replaceParticipant(participants, moved), pending: ctx.pending, events: [] };
}
