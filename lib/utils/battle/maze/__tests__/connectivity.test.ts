import { describe, expect, it } from "vitest";

import { carvePerfect } from "../carve";
import { allReachExit, mazeDistances } from "../connectivity";
import { placeTeleports, teleportPartner } from "../features";
import type { MazeGrid as MazeGridLike } from "../grid";
import { mulberry32 } from "../rng";
import { mazeNeighbors, wallSet } from "../walls";

import { emptyMaze } from "@/lib/constants/battle";
import { allCells, cellKey } from "@/lib/utils/battle/grid/geometry";
import type { GridPoint, MazeConfig } from "@/types/battle";

const p = (x: number, y: number) => ({ x, y });

const pathLength = (g: ReturnType<typeof grid>, from: GridPoint, to: GridPoint) => mazeDistances(g, [from]).get(cellKey(to)) ?? null;

const reachesExit = (g: ReturnType<typeof grid>, from: GridPoint) => allReachExit(g, [from]);

const grid = (maze: Partial<MazeConfig>) => ({ cols: 4, rows: 3, maze: { ...emptyMaze(), ...maze } });

describe("mazeDistances", () => {
  it("counts 8-direction steps on an open grid", () => {
    expect(pathLength(grid({}), p(0, 0), p(3, 2))).toBe(3);
    expect(pathLength(grid({}), p(1, 1), p(1, 1))).toBe(0);
  });

  it("goes around a wall and cannot cut a blocked corner", () => {
    const g = grid({ walls: ["0:0:e", "0:0:s"] });

    expect(pathLength(g, p(0, 0), p(1, 1))).toBeNull();
    expect(pathLength(grid({ walls: ["0:0:e"] }), p(0, 0), p(1, 0))).toBe(3);
  });

  it("null when the target is outside the grid", () => {
    expect(pathLength(grid({}), p(0, 0), p(9, 9))).toBeNull();
  });
});

describe("allReachExit", () => {
  it("true without an exit", () => {
    expect(allReachExit(grid({ walls: ["0:0:e", "0:0:s"] }), [p(0, 0)])).toBe(true);
  });

  it("false when a point is walled off from the exit", () => {
    const g = grid({ walls: ["0:0:e", "0:0:s"], exit: p(3, 2) });

    expect(allReachExit(g, [p(2, 2), p(0, 0)])).toBe(false);
    expect(allReachExit(g, [p(2, 2), p(1, 1)])).toBe(true);
  });
});

describe("allReachExit з телепортами", () => {
  // пара телепорта — замкнена клітинка (0,1): ступив на (2,0) — і застряг
  const pocket = { cols: 5, rows: 2, maze: { ...emptyMaze(), exit: p(4, 0), walls: ["0:0:s", "1:0:s", "2:0:s", "3:0:s", "4:0:s", "0:1:e"], teleports: [[p(2, 0), p(0, 1)]] as MazeConfig["teleports"] } };

  it("телепорт на вузькому місці відрізає від виходу, хоча клітинки й з'єднані", () => {
    expect(reachesExit(pocket, p(1, 0))).toBe(false);
    expect(allReachExit(pocket, [p(3, 0)])).toBe(true);
    expect(allReachExit(pocket, [p(3, 0), p(1, 0)])).toBe(false);
    expect(pathLength(pocket, p(1, 0), p(4, 0))).toBe(3);
  });

  it("телепорт переносить ближче до виходу", () => {
    const g = { cols: 5, rows: 2, maze: { ...emptyMaze(), exit: p(4, 1), walls: ["1:0:e", "1:1:e"], teleports: [[p(1, 0), p(3, 0)]] as MazeConfig["teleports"] } };

    expect(reachesExit(g, p(0, 1))).toBe(true);
    expect(reachesExit({ ...g, maze: { ...g.maze, teleports: [] } }, p(0, 1))).toBe(false);
  });
});

describe("allReachExit збігається з пошуком від кожної точки", () => {
  // еталон: прямий пошук, як у русі — ступив на телепорт, і тебе переносить до пари
  function naiveReaches(g: MazeGridLike, from: GridPoint): boolean {
    const exit = g.maze.exit as GridPoint;

    if (cellKey(from) === cellKey(exit)) return true;

    const walls = wallSet(g.maze);

    const seen = new Set([cellKey(from)]);

    const queue = [from];

    for (let i = 0; i < queue.length; i++) {
      for (const n of mazeNeighbors(g, walls, queue[i])) {
        if (cellKey(n) === cellKey(exit)) return true;

        const land = teleportPartner(g.maze, n) ?? n;

        if (seen.has(cellKey(land))) continue;

        seen.add(cellKey(land));
        queue.push(land);
      }
    }

    return false;
  }

  it("на випадкових лабіринтах із телепортами", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const rnd = mulberry32(seed);

      const size = { cols: 6 + (seed % 5), rows: 5 + (seed % 4) };

      const walls = [...carvePerfect(size, seed % 2 ? "prim" : "backtracker", rnd)].filter(() => rnd() < 0.8);

      const exit = { x: size.cols - 1, y: Math.floor(rnd() * size.rows) };

      const teleports = placeTeleports(size, 2, new Set(), exit, rnd);

      const g = { ...size, maze: { ...emptyMaze(), walls, exit, teleports } };

      for (const cell of allCells(size)) expect(allReachExit(g, [cell])).toBe(naiveReaches(g, cell));
    }
  });
});
