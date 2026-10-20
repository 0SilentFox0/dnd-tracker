import { describe, expect, it } from "vitest";

import { allReachExit, mazeDistances } from "../connectivity";
import { type GenerateInput, generateMaze, MAZE_SCATTER_ERROR, reshuffleMaze } from "../generate";
import { isEdgeCell } from "../walls";

import { emptyMaze, MAZE_SCATTER_MIN_GAP, MAZE_TELEPORT_MIN_DISTANCE } from "@/lib/constants/battle";
import { cellDistance, cellKey, parseCellKey } from "@/lib/utils/battle/grid/geometry";
import type { GridPoint, MazeConfig, MazeDifficulty } from "@/types/battle";

const p = (x: number, y: number) => ({ x, y });

const LEVELS: MazeDifficulty[] = ["easy", "medium", "hard"];

function input(cols: number, rows: number, over: Partial<GenerateInput> = {}): GenerateInput {
  return {
    grid: { cols, rows },
    difficulty: "medium",
    teleportPairs: 2,
    fogPatches: 3,
    exit: null,
    positions: [p(Math.floor(cols / 2), Math.floor(rows / 2)), p(cols - 3, 2)],
    starts: [p(0, 0), p(0, rows - 1), p(cols - 1, 0)],
    seed: 42,
    ...over,
  };
}

function ok(result: MazeConfig | { error: string }): MazeConfig {
  if ("error" in result) throw new Error(result.error);

  return result;
}

function hasOpenSquare(cols: number, rows: number, walls: string[]): boolean {
  const set = new Set(walls);

  for (let y = 0; y < rows - 1; y++) {
    for (let x = 0; x < cols - 1; x++) {
      if (![`${x}:${y}:e`, `${x}:${y}:s`, `${x + 1}:${y}:s`, `${x}:${y + 1}:e`].some((w) => set.has(w))) return true;
    }
  }

  return false;
}

function fogPatches(fog: string[]): string[][] {
  const left = new Set(fog);

  const out: string[][] = [];

  for (const start of fog) {
    if (!left.has(start)) continue;

    const patch = [start];

    left.delete(start);

    for (let i = 0; i < patch.length; i++) {
      const c = parseCellKey(patch[i]);

      for (const n of [p(c.x + 1, c.y), p(c.x - 1, c.y), p(c.x, c.y + 1), p(c.x, c.y - 1)]) {
        if (left.delete(cellKey(n))) patch.push(cellKey(n));
      }
    }

    out.push(patch);
  }

  return out;
}

describe("generateMaze", () => {
  it("is deterministic for a seed", () => {
    expect(generateMaze(input(20, 12))).toEqual(generateMaze(input(20, 12)));
    expect(ok(generateMaze(input(20, 12))).walls).not.toEqual(ok(generateMaze(input(20, 12, { seed: 7 }))).walls);
  });

  it("walls are sorted", () => {
    const { walls } = ok(generateMaze(input(20, 12)));

    expect(walls).toEqual([...walls].sort());
  });

  for (const [cols, rows] of [
    [20, 12],
    [40, 30],
  ]) {
    for (const difficulty of LEVELS) {
      it(`${difficulty} ${cols}×${rows}: exit on the edge, everyone reaches it`, () => {
        for (let seed = 0; seed < 5; seed++) {
          const inp = input(cols, rows, { difficulty, seed });

          const maze = ok(generateMaze(inp));

          expect(maze.exit).not.toBeNull();
          expect(isEdgeCell(inp.grid, maze.exit as GridPoint)).toBe(true);
          expect(allReachExit({ cols, rows, maze }, [...inp.positions, ...inp.starts])).toBe(true);
          expect(maze.marks).toEqual({});
          expect(maze.difficulty).toBe(difficulty);
        }
      });
    }
  }

  it("keeps a DM-set exit and rejects one off the edge", () => {
    expect(ok(generateMaze(input(20, 12, { exit: p(19, 6) }))).exit).toEqual(p(19, 6));
    expect(generateMaze(input(20, 12, { exit: p(5, 5) }))).toHaveProperty("error");
  });

  it("hard exit is the farthest edge cell from the starts", () => {
    const maze = ok(generateMaze(input(20, 12, { difficulty: "hard", starts: [p(0, 0)], positions: [] })));

    const dist = mazeDistances({ cols: 20, rows: 12, maze }, [p(0, 0)]);

    const edgeMax = Math.max(...[...dist].filter(([k]) => isEdgeCell({ cols: 20, rows: 12 }, parseCellKey(k))).map(([, d]) => d));

    expect(dist.get(cellKey(maze.exit as GridPoint))).toBe(edgeMax);
  });

  it("hard has at least 15 % more walls than easy, easy has an open 2×2", () => {
    for (let seed = 0; seed < 5; seed++) {
      const easy = ok(generateMaze(input(20, 12, { difficulty: "easy", seed }))).walls;

      const hard = ok(generateMaze(input(20, 12, { difficulty: "hard", seed }))).walls;

      expect(hard.length).toBeGreaterThanOrEqual(easy.length * 1.15);
      expect(hasOpenSquare(20, 12, easy)).toBe(true);
    }
  });

  it("teleports: far apart, not on the exit or a participant", () => {
    for (let seed = 0; seed < 10; seed++) {
      const inp = input(20, 12, { seed, teleportPairs: 3 });

      const maze = ok(generateMaze(inp));

      const banned = new Set([...inp.positions, ...inp.starts, maze.exit as GridPoint].map(cellKey));

      expect(maze.teleports).toHaveLength(3);

      for (const [a, b] of maze.teleports) {
        expect(cellDistance(a, b)).toBeGreaterThanOrEqual(MAZE_TELEPORT_MIN_DISTANCE);
        expect(banned.has(cellKey(a)) || banned.has(cellKey(b))).toBe(false);
      }

      expect(new Set(maze.teleports.flat().map(cellKey)).size).toBe(6);
    }
  });

  it("fog: patches of 2–4 adjacent cells, off the exit and teleports", () => {
    for (let seed = 0; seed < 10; seed++) {
      const maze = ok(generateMaze(input(20, 12, { seed, fogPatches: 4 })));

      const patches = fogPatches(maze.fog);

      expect(patches).toHaveLength(4);
      expect(patches.every((x) => x.length >= 2 && x.length <= 4)).toBe(true);
      expect(maze.fog).not.toContain(cellKey(maze.exit as GridPoint));
      expect(maze.teleports.flat().some((t) => maze.fog.includes(cellKey(t)))).toBe(false);
    }
  });

  it("40×30 generates fast", () => {
    const start = performance.now();

    ok(generateMaze(input(40, 30, { difficulty: "hard", teleportPairs: 4, fogPatches: 6 })));
    expect(performance.now() - start).toBeLessThan(100);
  });
});

describe("reshuffleMaze", () => {
  const grid = { cols: 20, rows: 12 };

  const positions = { a: p(1, 1), b: p(10, 6), c: p(18, 10) };

  const prev: MazeConfig = {
    ...emptyMaze("easy"),
    walls: ["1:1:e"],
    exit: p(19, 5),
    dark: true,
    marks: { "1:1": { symbol: "cross", color: "#fff", by: "a" } },
  };

  const base = { grid, maze: prev, participantIds: ["a", "b", "c"], positions, teleportPairs: 2, fogPatches: 2, seed: 9 };

  it("walls: keeps exit, difficulty, dark and positions, clears marks", () => {
    const res = reshuffleMaze({ ...base, mode: "walls" });

    if ("error" in res) throw new Error(res.error);

    expect(res.positions).toEqual(positions);
    expect(res.maze.exit).toEqual(prev.exit);
    expect(res.maze.difficulty).toBe("easy");
    expect(res.maze.dark).toBe(true);
    expect(res.maze.marks).toEqual({});
    expect(res.maze.walls).not.toEqual(prev.walls);
    expect(res.maze.teleports).toHaveLength(2);
    expect(allReachExit({ ...grid, maze: res.maze }, Object.values(positions))).toBe(true);
    expect(res.maze.teleports.flat().some((t) => Object.values(positions).some((q) => cellKey(q) === cellKey(t)))).toBe(false);
  });

  it("scatter: new distinct positions with the gap, off the exit and teleports", () => {
    for (let seed = 0; seed < 10; seed++) {
      const res = reshuffleMaze({ ...base, mode: "scatter", seed });

      if ("error" in res) throw new Error(res.error);

      const cells = Object.values(res.positions);

      expect(Object.keys(res.positions).sort()).toEqual(["a", "b", "c"]);

      for (let i = 0; i < cells.length; i++) {
        for (let j = i + 1; j < cells.length; j++) expect(cellDistance(cells[i], cells[j])).toBeGreaterThanOrEqual(MAZE_SCATTER_MIN_GAP);
      }

      const keys = cells.map(cellKey);

      expect(keys).not.toContain(cellKey(prev.exit as GridPoint));
      expect(res.maze.teleports.flat().some((t) => keys.includes(cellKey(t)))).toBe(false);
      expect(allReachExit({ ...grid, maze: res.maze }, cells)).toBe(true);
    }
  });

  it("scatter on 6×4 with 8 participants fails fast", () => {
    const ids = Array.from({ length: 8 }, (_, i) => `p${i}`);

    const start = performance.now();

    const res = reshuffleMaze({ ...base, grid: { cols: 6, rows: 4 }, maze: { ...prev, exit: p(5, 2) }, participantIds: ids, positions: {}, mode: "scatter" });

    expect(res).toEqual({ error: MAZE_SCATTER_ERROR });
    expect(performance.now() - start).toBeLessThan(100);
  });
});
