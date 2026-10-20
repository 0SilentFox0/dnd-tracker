import { DIR_VECTORS } from "./direction";
import { canStep, mazeNeighbors, wallSet } from "./walls";

import { MAZE_VISION_RANGE } from "@/lib/constants/battle";
import { cellDistance, cellKey, cellLine, inBounds } from "@/lib/utils/battle/grid/geometry";
import type { BattleParticipant, Direction8, GridPoint, MazeConfig } from "@/types/battle";

export interface MazeGrid {
  cols: number;
  rows: number;
  maze: MazeConfig;
}

export interface Viewpoint {
  position: GridPoint;
  facing: Direction8;
}

const CONE_EPS = 1e-9;

const HALF_CONE_COS = Math.SQRT1_2;

export function lineClear(grid: MazeGrid, a: GridPoint, b: GridPoint): boolean {
  const walls = wallSet(grid.maze);

  const line = cellLine(a, b);

  for (let i = 1; i < line.length; i++) {
    if (!canStep(grid, walls, line[i - 1], line[i])) return false;
  }

  return true;
}

function inCone(from: Viewpoint, dx: number, dy: number): boolean {
  const f = DIR_VECTORS[from.facing];

  const cos = (dx * f.x + dy * f.y) / (Math.hypot(dx, dy) * Math.hypot(f.x, f.y));

  return cos >= HALF_CONE_COS - CONE_EPS;
}

export function mazeVision(grid: MazeGrid, from: Viewpoint): ReadonlySet<string> {
  const { position } = from;

  const out = new Set<string>([cellKey(position)]);

  const walls = wallSet(grid.maze);

  for (const n of mazeNeighbors(grid, walls, position)) out.add(cellKey(n));

  if (grid.maze.fog.includes(cellKey(position))) return out;

  for (let dy = -MAZE_VISION_RANGE; dy <= MAZE_VISION_RANGE; dy++) {
    for (let dx = -MAZE_VISION_RANGE; dx <= MAZE_VISION_RANGE; dx++) {
      if ((dx === 0 && dy === 0) || !inCone(from, dx, dy)) continue;

      const cell = { x: position.x + dx, y: position.y + dy };

      if (inBounds(grid, cell) && lineClear(grid, position, cell)) out.add(cellKey(cell));
    }
  }

  return out;
}

export function seesParticipant(grid: MazeGrid, vision: ReadonlySet<string>, from: GridPoint, target: GridPoint): boolean {
  const key = cellKey(target);

  if (!vision.has(key)) return false;

  return !grid.maze.fog.includes(key) || cellDistance(from, target) <= 1;
}

export function viewpointOf(p: BattleParticipant): Viewpoint | null {
  const { position, facing } = p.battleData;

  return position ? { position, facing: facing ?? "s" } : null;
}

export function unionVision(grid: MazeGrid, viewers: Viewpoint[]): ReadonlySet<string> {
  const out = new Set<string>();

  for (const v of viewers) for (const key of mazeVision(grid, v)) out.add(key);

  return out;
}
