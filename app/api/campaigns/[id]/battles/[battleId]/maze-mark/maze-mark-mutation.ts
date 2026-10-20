import { resolveMover } from "../move/resolve-mover";

import { mazeMarkSchema } from "@/lib/schemas/battles";
import { isDormant, replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { cellKey } from "@/lib/utils/battle/grid/geometry";
import { markColor, mazeBudgetLeft } from "@/lib/utils/battle/modes/maze";
import { MAZE_TEXTS } from "@/lib/utils/battle/modes/maze/texts";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleAccessError, rejectAction } from "@/lib/utils/battle/store";
import { assertCanAct } from "@/lib/utils/battle/turn";
import type { MazeMarkData } from "@/types/api";

export { mazeMarkSchema };

export type MazeMarkBody = MazeMarkData;

export function mazeMarkMutation(ctx: BattleMutationContext, data: MazeMarkBody): MutationResult {
  const map = ctx.meta.map;

  if (!map?.maze) return rejectAction(MAZE_TEXTS.notMaze);

  const { participants, mover, ownTurn } = resolveMover(ctx, data.participantId, (ps) => ps);

  if (!ownTurn) throw new BattleAccessError(403, MAZE_TEXTS.markOwnTurn);

  const position = mover.battleData.position;

  if (!position || isDormant(mover)) return rejectAction(MAZE_TEXTS.markUnable);

  assertCanAct(ctx, mover.basicInfo.id);

  if (mazeBudgetLeft(mover) < 1) rejectAction(MAZE_TEXTS.markNoSteps);

  const id = mover.basicInfo.id;

  const marked = { ...mover, battleData: { ...mover.battleData, movementUsed: (mover.battleData.movementUsed ?? 0) + 1 } };

  const maze = { ...map.maze, marks: { ...map.maze.marks, [cellKey(position)]: { symbol: data.symbol, color: markColor(id), by: id } } };

  return { participants: replaceParticipant(participants, marked), pending: ctx.pending, events: [], scene: { map: { ...map, maze } } };
}
