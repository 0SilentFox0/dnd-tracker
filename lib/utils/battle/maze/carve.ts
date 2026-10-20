import type { GridSize } from "./grid";
import { pick, randInt, type Rng, shuffled } from "./rng";
import { allInteriorEdges, edgeKey } from "./walls";

import { cellKey, orthoNeighbors } from "@/lib/utils/battle/grid/geometry";
import type { GridPoint, MazeDifficulty } from "@/types/battle";

export type CarveAlgo = "backtracker" | "prim";

const LOOP_SHARE: Record<MazeDifficulty, number> = { easy: 0.25, medium: 0.08, hard: 0.02 };

function openEdge(walls: Set<string>, a: GridPoint, b: GridPoint): void {
  walls.delete(edgeKey(a, b) as string);
}

function carveBacktracker(grid: GridSize, walls: Set<string>, rnd: Rng): void {
  const start = { x: randInt(rnd, grid.cols), y: randInt(rnd, grid.rows) };

  const visited = new Set([cellKey(start)]);

  const stack = [start];

  while (stack.length) {
    const cur = stack[stack.length - 1];

    const next = orthoNeighbors(grid, cur).filter((n) => !visited.has(cellKey(n)));

    if (!next.length) {
      stack.pop();
      continue;
    }

    const n = pick(rnd, next);

    openEdge(walls, cur, n);
    visited.add(cellKey(n));
    stack.push(n);
  }
}

function carvePrim(grid: GridSize, walls: Set<string>, rnd: Rng): void {
  const start = { x: randInt(rnd, grid.cols), y: randInt(rnd, grid.rows) };

  const visited = new Set([cellKey(start)]);

  const frontier: GridPoint[] = [];

  const inFrontier = new Set<string>();

  const expand = (p: GridPoint) => {
    for (const n of orthoNeighbors(grid, p)) {
      const key = cellKey(n);

      if (visited.has(key) || inFrontier.has(key)) continue;

      inFrontier.add(key);
      frontier.push(n);
    }
  };

  expand(start);

  while (frontier.length) {
    const i = randInt(rnd, frontier.length);

    const cell = frontier[i];

    frontier[i] = frontier[frontier.length - 1];
    frontier.pop();

    const links = orthoNeighbors(grid, cell).filter((n) => visited.has(cellKey(n)));

    openEdge(walls, cell, pick(rnd, links));
    visited.add(cellKey(cell));
    expand(cell);
  }
}

const CARVERS: Record<CarveAlgo, (grid: GridSize, walls: Set<string>, rnd: Rng) => void> = {
  backtracker: carveBacktracker,
  prim: carvePrim,
};

export function carvePerfect(grid: GridSize, algo: CarveAlgo, rnd: Rng): Set<string> {
  const walls = new Set(allInteriorEdges(grid));

  CARVERS[algo](grid, walls, rnd);

  return walls;
}

function openHall(grid: GridSize, walls: Set<string>, rnd: Rng): void {
  const size = Math.min(2 + randInt(rnd, 2), grid.cols, grid.rows);

  if (size < 2) return;

  const x0 = randInt(rnd, grid.cols - size + 1);

  const y0 = randInt(rnd, grid.rows - size + 1);

  for (let y = y0; y < y0 + size; y++) {
    for (let x = x0; x < x0 + size; x++) {
      if (x + 1 < x0 + size) openEdge(walls, { x, y }, { x: x + 1, y });

      if (y + 1 < y0 + size) openEdge(walls, { x, y }, { x, y: y + 1 });
    }
  }
}

export function addLoops(grid: GridSize, walls: Set<string>, difficulty: MazeDifficulty, rnd: Rng): void {
  const count = Math.round(walls.size * LOOP_SHARE[difficulty]);

  for (const key of shuffled(rnd, [...walls]).slice(0, count)) walls.delete(key);

  if (difficulty !== "easy") return;

  const halls = 2 + randInt(rnd, 2);

  for (let i = 0; i < halls; i++) openHall(grid, walls, rnd);
}
