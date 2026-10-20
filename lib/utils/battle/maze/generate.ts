import { addLoops, type CarveAlgo, carvePerfect, type GridSize } from "./carve";
import { allReachExit, mazeDistances } from "./connectivity";
import { allCells, placeFog, placeTeleports } from "./features";
import { mulberry32, pick, type Rng } from "./rng";
import { scatterAll } from "./scatter";
import type { MazeGrid } from "./vision";
import { isEdgeCell } from "./walls";

import { MAZE_MAX_GENERATION_ATTEMPTS } from "@/lib/constants/battle";
import { cellKey, inBounds } from "@/lib/utils/battle/grid/geometry";
import type { GridPoint, MazeConfig, MazeDifficulty } from "@/types/battle";

export const MAZE_GENERATION_ERROR = "Не вдалося згенерувати лабіринт — спробуйте менший рівень складності або більшу карту";

export const MAZE_SCATTER_ERROR = "Замало місця для розкидання";

export const MAZE_EXIT_ERROR = "Вихід має бути на краю карти";

export interface GenerateInput {
  grid: GridSize;
  difficulty: MazeDifficulty;
  teleportPairs: number;
  fogPatches: number;
  exit: GridPoint | null;
  positions: GridPoint[];
  starts: GridPoint[];
  seed: number;
}

export interface ReshuffleInput {
  grid: GridSize;
  maze: MazeConfig;
  mode: "walls" | "scatter";
  participantIds: string[];
  positions: Record<string, GridPoint>;
  teleportPairs: number;
  fogPatches: number;
  seed: number;
}

export type ReshuffleResult = { maze: MazeConfig; positions: Record<string, GridPoint> };

const ALGO: Record<MazeDifficulty, CarveAlgo> = { easy: "prim", medium: "prim", hard: "backtracker" };

function carveWalls(grid: GridSize, difficulty: MazeDifficulty, rnd: Rng): string[] {
  const walls = carvePerfect(grid, ALGO[difficulty], rnd);

  addLoops(grid, walls, difficulty, rnd);

  return [...walls].sort();
}

function pickExit(grid: MazeGrid, input: GenerateInput, rnd: Rng): GridPoint | null {
  const occupied = new Set([...input.positions, ...input.starts].map(cellKey));

  const edges = allCells(grid).filter((p) => isEdgeCell(grid, p) && !occupied.has(cellKey(p)));

  if (!edges.length) return null;

  const sources = input.starts.length ? input.starts : input.positions;

  if (input.difficulty !== "hard" || !sources.length) return pick(rnd, edges);

  const dist = mazeDistances(grid, sources);

  const far = Math.max(...edges.map((p) => dist.get(cellKey(p)) ?? -1));

  return pick(
    rnd,
    edges.filter((p) => (dist.get(cellKey(p)) ?? -1) === far),
  );
}

function withFeatures(grid: GridSize, maze: MazeConfig, counts: { teleportPairs: number; fogPatches: number }, occupied: GridPoint[], rnd: Rng): MazeConfig {
  const teleports = placeTeleports(grid, counts.teleportPairs, new Set(occupied.map(cellKey)), maze.exit, rnd);

  const exclude = new Set(teleports.flat().map(cellKey));

  if (maze.exit) exclude.add(cellKey(maze.exit));

  return { ...maze, teleports, fog: placeFog(grid, counts.fogPatches, exclude, rnd) };
}

export function generateMaze(input: GenerateInput): MazeConfig | { error: string } {
  const { grid, difficulty } = input;

  if (input.exit && (!inBounds(grid, input.exit) || !isEdgeCell(grid, input.exit))) return { error: MAZE_EXIT_ERROR };

  const points = [...input.positions, ...input.starts];

  for (let attempt = 0; attempt < MAZE_MAX_GENERATION_ATTEMPTS; attempt++) {
    const rnd = mulberry32(input.seed + attempt);

    const base: MazeConfig = { walls: carveWalls(grid, difficulty, rnd), exit: null, difficulty, teleports: [], fog: [], marks: {}, dark: false };

    const exit = input.exit ?? pickExit({ ...grid, maze: base }, input, rnd);

    if (!exit) continue;

    const maze = withFeatures(grid, { ...base, exit }, input, points, rnd);

    if (allReachExit({ ...grid, maze }, points)) return maze;
  }

  return { error: MAZE_GENERATION_ERROR };
}

export function reshuffleMaze(input: ReshuffleInput): ReshuffleResult | { error: string } {
  const { grid, maze: prev } = input;

  for (let attempt = 0; attempt < MAZE_MAX_GENERATION_ATTEMPTS; attempt++) {
    const rnd = mulberry32(input.seed + attempt);

    const base: MazeConfig = { ...prev, walls: carveWalls(grid, prev.difficulty, rnd), teleports: [], fog: [], marks: {} };

    const positions = input.mode === "scatter" ? scatterAll({ ...grid, maze: base }, input.participantIds, rnd) : input.positions;

    // розкидання не залежить від стін — повтор із новим зерном не допоможе
    if (!positions) return { error: MAZE_SCATTER_ERROR };

    const points = Object.values(positions);

    const maze = withFeatures(grid, base, input, points, rnd);

    if (allReachExit({ ...grid, maze }, points)) return { maze, positions };
  }

  return { error: MAZE_GENERATION_ERROR };
}
