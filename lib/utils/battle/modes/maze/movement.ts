import { directionOf, inwardFacing } from "./direction";
import { featureKeys, teleportPartner } from "./features";
import type { MazeGrid } from "./grid";
import { canStep, isEdgeCell, wallSet } from "./walls";

import { ParticipantSide } from "@/lib/constants/battle";
import { cellKey, cellsByDistance, mapCentre, neighbors, samePoint } from "@/lib/utils/battle/grid/geometry";
import { occupiedBy, occupiesCells } from "@/lib/utils/battle/grid/occupancy";
import { MAZE_STEPS_PER_TURN } from "@/lib/utils/battle/modes/maze/constants";
import { MAZE_TEXTS } from "@/lib/utils/battle/modes/maze/texts";
import type { BattleParticipant, GridPoint } from "@/types/battle";

export interface MazeMoveResult {
  mover: BattleParticipant;
  stepsUsed: number;
  teleported: boolean;
  escaped: boolean;
}

export interface ReachableArgs {
  participants: BattleParticipant[];
  mover: BattleParticipant;
  budget: number;
  limit?: ReadonlySet<string>;
}

export interface Reach {
  cost: number;
  path: GridPoint[];
}

export const mazeBudgetLeft = (p: BattleParticipant): number => Math.max(0, MAZE_STEPS_PER_TURN - (p.battleData.movementUsed ?? 0));

/** Шлях включно зі стартовою клітинкою; сама стартова в результат не потрапляє. */
export function mazeReachable(grid: MazeGrid, { participants, mover, budget, limit }: ReachableArgs): Map<string, Reach> {
  const out = new Map<string, Reach>();

  const start = mover.battleData.position;

  if (!start) return out;

  const walls = wallSet(grid.maze);

  const blocked = occupiedBy(participants, (p) => p.basicInfo.id !== mover.basicInfo.id);

  const terminal = featureKeys(grid.maze);

  const startKey = cellKey(start);

  const seen = new Map<string, GridPoint[]>([[startKey, [start]]]);

  let frontier: GridPoint[] = [start];

  for (let step = 1; step <= budget && frontier.length > 0; step++) {
    const next: GridPoint[] = [];

    for (const from of frontier) {
      if (step > 1 && terminal.has(cellKey(from))) continue;

      for (const to of neighbors(from)) {
        const key = cellKey(to);

        if (seen.has(key) || blocked.has(key) || (limit && !limit.has(key)) || !canStep(grid, walls, from, to)) continue;

        const path = [...(seen.get(cellKey(from)) as GridPoint[]), to];

        seen.set(key, path);
        out.set(key, { cost: step, path });
        next.push(to);
      }
    }

    frontier = next;
  }

  return out;
}

export function applyMazeMove(grid: MazeGrid, args: { participants: BattleParticipant[]; mover: BattleParticipant; to: GridPoint }): MazeMoveResult | { error: string } {
  const { participants, mover, to } = args;

  const reach = mazeReachable(grid, { participants, mover, budget: mazeBudgetLeft(mover) }).get(cellKey(to));

  if (!reach) return { error: MAZE_TEXTS.moveBlocked };

  const prev = reach.path[reach.path.length - 2];

  const blocked = occupiedBy(participants, (p) => p.basicInfo.id !== mover.basicInfo.id);

  const partner = teleportPartner(grid.maze, to);

  const teleported = partner !== null && !blocked.has(cellKey(partner));

  // вихід — лише для героїв; для ворогів це звичайна клітинка, інакше бій не закінчився б перемогою
  const escaped = mover.basicInfo.side === ParticipantSide.ALLY && !!grid.maze.exit && samePoint(grid.maze.exit, to);

  const battleData = {
    ...mover.battleData,
    position: teleported && partner ? partner : to,
    facing: directionOf(prev, to) ?? mover.battleData.facing,
    movementUsed: (mover.battleData.movementUsed ?? 0) + reach.cost,
    ...(escaped && { escaped: true }),
  };

  return { mover: { ...mover, battleData }, stepsUsed: reach.cost, teleported, escaped };
}

export function placeMazeParticipants(grid: MazeGrid, participants: BattleParticipant[]): BattleParticipant[] {
  const sized = participants.map((p) => ((p.combatStats.gridSize ?? 1) > 1 ? { ...p, combatStats: { ...p.combatStats, gridSize: 1 } } : p));

  const taken = occupiedBy(sized, () => true);

  const reserved = featureKeys(grid.maze);

  const cells = cellsByDistance(grid, mapCentre(grid)).filter((c) => !reserved.has(cellKey(c)));

  const edge = cells.filter((c) => isEdgeCell(grid, c));

  const inner = cells.filter((c) => !isEdgeCell(grid, c));

  return sized.map((p) => {
    if (p.battleData.position || !occupiesCells(p)) return p;

    const ally = p.basicInfo.side === ParticipantSide.ALLY;

    const cell = (ally ? edge : inner).find((c) => !taken.has(cellKey(c)));

    if (!cell) return p;

    taken.add(cellKey(cell));

    return { ...p, battleData: { ...p.battleData, position: cell, ...(ally && { facing: inwardFacing(grid, cell) }) } };
  });
}
