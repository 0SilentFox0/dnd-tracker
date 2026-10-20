import { resolveMover } from "./resolve-mover";

import { ParticipantSide } from "@/lib/constants/battle";
import { replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { placeParticipants } from "@/lib/utils/battle/grid/placement";
import { applyMazeMove, mazeGridOf, mazePlacementError, placeInMaze } from "@/lib/utils/battle/modes/maze";
import { MAZE_TEXTS } from "@/lib/utils/battle/modes/maze/texts";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { actorEvent, battleActionToEvent, rejectAction } from "@/lib/utils/battle/store";
import { advanceTurn, assertCanAct } from "@/lib/utils/battle/turn";
import type { BattleMapConfig, GridPoint } from "@/types/battle";

export interface MazeMoveBody {
  participantId: string;
  to: GridPoint;
  free?: boolean;
  returnToStart?: true;
}

export function mazeMove(ctx: BattleMutationContext, data: MazeMoveBody, base: BattleMapConfig): MutationResult {
  const grid = mazeGridOf(base)!;

  if (!grid.maze.exit) rejectAction(MAZE_TEXTS.notReady);

  if (data.returnToStart) rejectAction(MAZE_TEXTS.noReturnToStart);

  const { participants, mover, ownTurn } = resolveMover(ctx, data.participantId, (ps) => placeParticipants(base, ps));

  if (!ownTurn || (ctx.isDM && data.free === true)) {
    const error = mazePlacementError(grid, { participants, mover, to: data.to });

    if (error) rejectAction(error);

    return { participants: replaceParticipant(participants, placeInMaze(grid, mover, data.to)), pending: ctx.pending, events: [] };
  }

  if (grid.maze.dark) rejectAction(MAZE_TEXTS.dark);

  assertCanAct(ctx, mover.basicInfo.id);

  const step = applyMazeMove(grid, { participants, mover, to: data.to });

  if ("error" in step) return rejectAction(step.error);

  const after = replaceParticipant(participants, step.mover);

  const firstStep = mover.basicInfo.side === ParticipantSide.ALLY && !grid.maze.moved;

  const map: BattleMapConfig | null = firstStep ? { ...base, maze: { ...grid.maze, moved: true } } : null;

  if (!step.escaped) return { participants: after, pending: ctx.pending, events: [], ...(map && { scene: { map } }) };

  const escapedEvent = actorEvent(ctx.scene.round, step.mover, MAZE_TEXTS.escaped(mover.basicInfo.name));

  // вихід завершує хід героя тим самим рушієм, що й attack з endTurn
  const advanced = advanceTurn({ participants: after, pending: ctx.pending, scene: ctx.scene, rng: ctx.rng, map: map ?? base });

  return {
    participants: advanced.participants,
    pending: advanced.pending,
    scene: { ...advanced.scene, ...(map && { map }) },
    events: [escapedEvent, ...advanced.actions.map(battleActionToEvent)],
  };
}
