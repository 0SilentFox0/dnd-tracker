import { addLoops, type CarveAlgo, carvePerfect } from "./carve";
import { allReachExit, mazeDistances } from "./connectivity";
import { placeFog, placeTeleports } from "./features";
import type { GridSize, MazeGrid } from "./grid";
import { mulberry32, pick, type Rng } from "./rng";
import { scatterAll } from "./scatter";
import { isEdgeCell } from "./walls";

import { emptyMaze, MAZE_MAX_GENERATION_ATTEMPTS } from "@/lib/constants/battle";
import { MAZE_TEXTS } from "@/lib/constants/maze-texts";
import { allCells, cellKey, inBounds } from "@/lib/utils/battle/grid/geometry";
import type { GridPoint, MazeConfig, MazeDifficulty } from "@/types/battle";

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

type Attempt<T> = T | { error: string } | null;

/** Спроби з послідовними зернами: null — повторити, { error } — здатися одразу. */
function retrySeeded<T>(seed: number, attempt: (rnd: Rng) => Attempt<T>): T | { error: string } {
  for (let i = 0; i < MAZE_MAX_GENERATION_ATTEMPTS; i++) {
    const out = attempt(mulberry32(seed + i));

    if (out !== null) return out;
  }

  return { error: MAZE_TEXTS.generationFailed };
}

function withFeatures(grid: GridSize, maze: MazeConfig, counts: { teleportPairs: number; fogPatches: number }, occupied: GridPoint[], rnd: Rng): MazeConfig {
  const teleports = placeTeleports(grid, counts.teleportPairs, new Set(occupied.map(cellKey)), maze.exit, rnd);

  const exclude = new Set(teleports.flat().map(cellKey));

  if (maze.exit) exclude.add(cellKey(maze.exit));

  return { ...maze, teleports, fog: placeFog(grid, counts.fogPatches, exclude, rnd) };
}

export function generateMaze(input: GenerateInput): MazeConfig | { error: string } {
  const { grid, difficulty } = input;

  if (input.exit && (!inBounds(grid, input.exit) || !isEdgeCell(grid, input.exit))) return { error: MAZE_TEXTS.exitOnEdge };

  const points = [...input.positions, ...input.starts];

  return retrySeeded(input.seed, (rnd) => {
    const base: MazeConfig = { ...emptyMaze(difficulty), walls: carveWalls(grid, difficulty, rnd) };

    const exit = input.exit ?? pickExit({ ...grid, maze: base }, input, rnd);

    if (!exit) return null;

    const maze = withFeatures(grid, { ...base, exit }, input, points, rnd);

    return allReachExit({ ...grid, maze }, points) ? maze : null;
  });
}

export function reshuffleMaze(input: ReshuffleInput): ReshuffleResult | { error: string } {
  const { grid, maze: prev } = input;

  return retrySeeded(input.seed, (rnd): Attempt<ReshuffleResult> => {
    const base: MazeConfig = { ...prev, walls: carveWalls(grid, prev.difficulty, rnd), teleports: [], fog: [], marks: {} };

    const positions = input.mode === "scatter" ? scatterAll({ ...grid, maze: base }, input.participantIds, rnd) : input.positions;

    // розкидання не залежить від стін — повтор із новим зерном не допоможе
    if (!positions) return { error: MAZE_TEXTS.scatterNoRoom };

    const points = Object.values(positions);

    const maze = withFeatures(grid, base, input, points, rnd);

    return allReachExit({ ...grid, maze }, points) ? { maze, positions } : null;
  });
}
