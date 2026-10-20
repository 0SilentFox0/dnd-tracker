import type { GridSize } from "./grid";
import { pick, randInt, type Rng, shuffled } from "./rng";

import { allCells, cellDistance, cellKey, neighbors, orthoNeighbors, samePoint } from "@/lib/utils/battle/grid/geometry";
import { MAZE_TELEPORT_MIN_DISTANCE } from "@/lib/utils/battle/modes/maze/constants";
import type { GridPoint, MazeConfig } from "@/types/battle";

const PATCH_ATTEMPTS = 30;

/** Клітинки виходу й телепортів: на них не ставлять учасників і не проходять крізь них. */
export function featureKeys(maze: Pick<MazeConfig, "exit" | "teleports">): Set<string> {
  return new Set([...(maze.exit ? [cellKey(maze.exit)] : []), ...maze.teleports.flatMap(([a, b]) => [cellKey(a), cellKey(b)])]);
}

export function teleportPartner(maze: Pick<MazeConfig, "teleports">, cell: GridPoint): GridPoint | null {
  for (const [a, b] of maze.teleports) {
    if (samePoint(a, cell)) return b;

    if (samePoint(b, cell)) return a;
  }

  return null;
}

export function placeTeleports(
  grid: GridSize,
  count: number,
  occupied: ReadonlySet<string>,
  exit: GridPoint | null,
  rnd: Rng,
): [GridPoint, GridPoint][] {
  const taken = new Set(occupied);

  if (exit) taken.add(cellKey(exit));

  const pairs: [GridPoint, GridPoint][] = [];

  const cells = allCells(grid);

  for (let i = 0; i < count; i++) {
    const free = cells.filter((c) => !taken.has(cellKey(c)));

    const pair = shuffled(rnd, free)
      .slice(0, PATCH_ATTEMPTS)
      .map((a): [GridPoint, GridPoint] | null => {
        const far = free.filter((b) => cellDistance(a, b) >= MAZE_TELEPORT_MIN_DISTANCE);

        return far.length ? [a, pick(rnd, far)] : null;
      })
      .find((p) => p !== null);

    // на малій карті пар може бути менше, ніж просили
    if (!pair) break;

    pairs.push(pair);
    taken.add(cellKey(pair[0]));
    taken.add(cellKey(pair[1]));
  }

  return pairs;
}

function growPatch(grid: GridSize, seed: GridPoint, size: number, blocked: (p: GridPoint) => boolean, rnd: Rng): GridPoint[] {
  const patch = [seed];

  const inPatch = new Set([cellKey(seed)]);

  while (patch.length < size) {
    const options = patch.flatMap((p) => orthoNeighbors(grid, p).filter((n) => !inPatch.has(cellKey(n)) && !blocked(n)));

    if (!options.length) break;

    const n = pick(rnd, options);

    patch.push(n);
    inPatch.add(cellKey(n));
  }

  return patch;
}

export function placeFog(grid: GridSize, count: number, exclude: ReadonlySet<string>, rnd: Rng): string[] {
  const fog = new Set<string>();

  // плями не торкаються одна одної, щоб кожна лишалась окремою плямою 2–4 клітинок
  const blocked = (p: GridPoint) => exclude.has(cellKey(p)) || fog.has(cellKey(p)) || neighbors(p).some((n) => fog.has(cellKey(n)));

  for (let i = 0; i < count; i++) {
    const size = 2 + randInt(rnd, 3);

    for (let attempt = 0; attempt < PATCH_ATTEMPTS; attempt++) {
      const seed = { x: randInt(rnd, grid.cols), y: randInt(rnd, grid.rows) };

      if (blocked(seed)) continue;

      const patch = growPatch(grid, seed, size, blocked, rnd);

      if (patch.length < 2) continue;

      for (const p of patch) fog.add(cellKey(p));
      break;
    }
  }

  return [...fog].sort();
}
