import { z } from "zod";

import { mazeMove } from "./maze-move";
import { resolveMover } from "./resolve-mover";

import { DEFAULT_HAZARD_LABEL } from "@/lib/constants/battle";
import { mapCellSchema } from "@/lib/schemas/battles";
import { findParticipant, isActive, replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { resolveDowned } from "@/lib/utils/abilities/engine/core/run-abilities";
import { canStand, cellKey, checkReturnToStart,hazardHit, hazardOnMove, moveBudget, placeParticipants, reachable } from "@/lib/utils/battle/grid";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleRuleError, type NewBattleEvent } from "@/lib/utils/battle/store";
import { assertNotPanicking } from "@/lib/utils/battle/turn";
import type { BattleParticipant, TerrainCell } from "@/types/battle";

export const moveSchema = z.object({
  participantId: z.string(),
  to: mapCellSchema,
  free: z.boolean().optional(),
  returnToStart: z.literal(true).optional(),
});

export type MoveBody = z.infer<typeof moveSchema>;

export function moveMutation(ctx: BattleMutationContext, data: MoveBody): MutationResult {
  const map = ctx.meta.map;

  if (!map) throw new BattleRuleError("action_rejected", "У цьому бою немає карти");

  if (map.maze) return mazeMove(ctx, data, { cols: map.cols, rows: map.rows, maze: map.maze });

  const { participants, mover, ownTurn } = resolveMover(ctx, data.participantId, (ps) => placeParticipants(map, ps));

  if (data.returnToStart) return returnToStart(ctx, participants, mover, ownTurn);

  let movementUsed = mover.battleData.movementUsed;

  let hazard: TerrainCell | null = null;

  // розстановка ДМ (чужий хід або free) — без бюджету й шляху
  const placement = !ownTurn || (ctx.isDM && data.free === true);

  if (!placement) {
    assertNotPanicking(ctx.scene.pendingMoraleCheck, mover.basicInfo.id);

    const cost = reachable(map, participants, mover, moveBudget({ map, dmUserId: ctx.isDM ? ctx.userId : null }, mover)).get(cellKey(data.to));

    if (cost === undefined) throw new BattleRuleError("action_rejected", "Туди не дійти: зайнято, закрито ворогами або не вистачає руху");

    movementUsed = (movementUsed ?? 0) + cost;
    hazard = hazardOnMove(map, participants, mover, data.to, cost);
  } else if (!canStand(map, participants, mover, data.to)) {
    throw new BattleRuleError("action_rejected", "Клітинка зайнята, неігрова або поза картою");
  }

  const moved = { ...mover, battleData: { ...mover.battleData, position: data.to, ...(movementUsed !== undefined && { movementUsed }) } };

  const after = replaceParticipant(participants, moved);

  const hit = hazard && hazardHit(moved, hazard, ctx.scene.round, after, ctx.rng ?? Math.random);

  if (!hazard || !hit) return { participants: after, pending: ctx.pending, events: [] };

  return { ...resolveHazardHit(ctx, after, moved, hazard, hit), pending: ctx.pending };
}

function returnToStart(ctx: BattleMutationContext, participants: BattleParticipant[], mover: BattleParticipant, ownTurn: boolean): MutationResult {
  const check = ownTurn ? checkReturnToStart(ctx.meta.map, participants, mover) : { ok: false as const, error: "Повернутися можна лише у свій хід" };

  if (!check.ok) throw new BattleRuleError("action_rejected", check.error);

  assertNotPanicking(ctx.scene.pendingMoraleCheck, mover.basicInfo.id);

  const moved = { ...mover, battleData: { ...mover.battleData, position: check.to, returnedThisTurn: true } };

  return { participants: replaceParticipant(participants, moved), pending: ctx.pending, events: [] };
}

function resolveHazardHit(
  ctx: BattleMutationContext,
  participants: BattleParticipant[],
  before: BattleParticipant,
  cell: TerrainCell,
  hit: NonNullable<ReturnType<typeof hazardHit>>,
): Pick<MutationResult, "participants" | "events"> {
  const id = before.basicInfo.id;

  let next = replaceParticipant(participants, hit.participant);

  const messages = [hit.message];

  if (!isActive(hit.participant)) {
    const downed = resolveDowned(next, { victimId: id, actorId: null }, { round: ctx.scene.round, rng: ctx.rng ?? Math.random });

    next = downed.participants;
    messages.push(...downed.messages);
  }

  const hp = (findParticipant(next, id) ?? hit.participant).combatStats.currentHp;

  const oldHp = before.combatStats.currentHp;

  const event: NewBattleEvent = {
    type: "ability",
    round: ctx.scene.round,
    actorId: id,
    targets: [],
    hpChanges: [{ participantId: id, participantName: before.basicInfo.name, oldHp, newHp: hp, change: oldHp - hp }],
    resultText: messages.join("; "),
    details: {
      actorName: before.basicInfo.name,
      actorSide: before.basicInfo.side,
      actionDetails: {
        hazard: { label: cell.label ?? DEFAULT_HAZARD_LABEL, damageType: cell.damage?.type ?? "", damage: hit.damage },
        damageRolls: [{ dice: cell.damage?.dice ?? String(cell.damage?.amount ?? 0), results: [], total: hit.damage, damageType: cell.damage?.type ?? "" }],
      },
    },
  };

  return { participants: next, events: [event] };
}
