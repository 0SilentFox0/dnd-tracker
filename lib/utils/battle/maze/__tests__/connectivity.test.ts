import { describe, expect, it } from "vitest";

import { allReachExit, pathLength } from "../connectivity";

import { emptyMaze } from "@/lib/constants/battle";
import type { MazeConfig } from "@/types/battle";

const p = (x: number, y: number) => ({ x, y });

const grid = (maze: Partial<MazeConfig>) => ({ cols: 4, rows: 3, maze: { ...emptyMaze(), ...maze } });

describe("pathLength", () => {
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
