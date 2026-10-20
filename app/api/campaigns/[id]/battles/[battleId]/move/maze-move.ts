import { resolveMover } from "./resolve-mover";

import { ParticipantSide } from "@/lib/constants/battle";
import { replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import type { MazeGrid } from "@/lib/utils/battle/maze";
import { applyMazeMove, heroEvent, mazePlacementError, placeInMaze, placeMazeParticipants } from "@/lib/utils/battle/maze";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { battleActionToEvent, BattleRuleError } from "@/lib/utils/battle/store";
import { advanceTurn, assertNotPanicking } from "@/lib/utils/battle/turn";
import type { BattleMapConfig, GridPoint } from "@/types/battle";

export interface MazeMoveBody {
  participantId: string;
  to: GridPoint;
  free?: boolean;
  returnToStart?: true;
}

export const MAZE_NOT_READY = "Лабіринт ще не готовий";

export function mazeMove(ctx: BattleMutationContext, data: MazeMoveBody, grid: MazeGrid): MutationResult {
  if (!grid.maze.exit) throw new BattleRuleError("action_rejected", MAZE_NOT_READY);

  if (data.returnToStart) throw new BattleRuleError("action_rejected", "У лабіринті повернутися на старт не можна");

  const { participants, mover, ownTurn } = resolveMover(ctx, data.participantId, (ps) => placeMazeParticipants(grid, ps));

  if (!ownTurn || (ctx.isDM && data.free === true)) {
    const error = mazePlacementError(grid, { participants, mover, to: data.to });

    if (error) throw new BattleRuleError("action_rejected", error);

    return { participants: replaceParticipant(participants, placeInMaze(grid, mover, data.to)), pending: ctx.pending, events: [] };
  }

  assertNotPanicking(ctx.scene.pendingMoraleCheck, mover.basicInfo.id);

  const step = applyMazeMove(grid, { participants, mover, to: data.to });

  if ("error" in step) throw new BattleRuleError("action_rejected", step.error);

  const after = replaceParticipant(participants, step.mover);

  const firstStep = mover.basicInfo.side === ParticipantSide.ALLY && !grid.maze.moved;

  const map: BattleMapConfig | null = firstStep && ctx.meta.map ? { ...ctx.meta.map, maze: { ...grid.maze, moved: true } } : null;

  if (!step.escaped) return { participants: after, pending: ctx.pending, events: [], ...(map && { scene: { map } }) };

  const escapedEvent = heroEvent(ctx.scene.round, step.mover, `${mover.basicInfo.name} вибрався з лабіринту`);

  // вихід завершує хід героя тим самим рушієм, що й attack з endTurn
  const advanced = advanceTurn({ participants: after, pending: ctx.pending, scene: ctx.scene, rng: ctx.rng, map: map ?? ctx.meta.map });

  return {
    participants: advanced.participants,
    pending: advanced.pending,
    scene: { ...advanced.scene, ...(map && { map }) },
    events: [escapedEvent, ...advanced.actions.map(battleActionToEvent)],
  };
}
