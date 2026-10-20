import { z } from "zod";

import { resolveMover } from "../move/resolve-mover";

import { replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { cellKey } from "@/lib/utils/battle/grid/geometry";
import { markColor,mazeBudgetLeft } from "@/lib/utils/battle/maze";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleAccessError, BattleRuleError } from "@/lib/utils/battle/store";
import { assertNotPanicking } from "@/lib/utils/battle/turn";

export const mazeMarkSchema = z.object({
  participantId: z.string(),
  symbol: z.enum(["arrow-n", "arrow-e", "arrow-s", "arrow-w", "cross", "skull", "star"]),
});

export type MazeMarkBody = z.infer<typeof mazeMarkSchema>;

export function mazeMarkMutation(ctx: BattleMutationContext, data: MazeMarkBody): MutationResult {
  const map = ctx.meta.map;

  if (!map?.maze) throw new BattleRuleError("action_rejected", "Цей бій не лабіринт");

  const { participants, mover, ownTurn } = resolveMover(ctx, data.participantId, (ps) => ps);

  if (!ownTurn) throw new BattleAccessError(403, "Мітку можна ставити лише у свій хід");

  const position = mover.battleData.position;

  if (!position || mover.battleData.dormant) throw new BattleRuleError("action_rejected", "Учасник не може ставити мітку");

  assertNotPanicking(ctx.scene.pendingMoraleCheck, mover.basicInfo.id);

  if (mazeBudgetLeft(mover) < 1) throw new BattleRuleError("action_rejected", "Не вистачає кроків для мітки");

  const id = mover.basicInfo.id;

  const marked = { ...mover, battleData: { ...mover.battleData, movementUsed: (mover.battleData.movementUsed ?? 0) + 1 } };

  const maze = { ...map.maze, marks: { ...map.maze.marks, [cellKey(position)]: { symbol: data.symbol, color: markColor(id), by: id } } };

  return { participants: replaceParticipant(participants, marked), pending: ctx.pending, events: [], scene: { map: { ...map, maze } } };
}
