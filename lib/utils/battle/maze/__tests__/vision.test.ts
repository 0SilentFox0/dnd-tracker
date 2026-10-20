import { describe, expect, it } from "vitest";

import { lineClear, mazeVision, seesParticipant, unionVision, viewpointOf } from "../vision";

import type { MazeConfig } from "@/types/battle";

const p = (x: number, y: number) => ({ x, y });

const mk = (walls: string[] = [], fog: string[] = [], cols = 10, rows = 10) => ({
  cols,
  rows,
  maze: { walls, exit: null, difficulty: "normal", teleports: [], fog, marks: {}, dark: false } as unknown as MazeConfig,
});

describe("mazeVision", () => {
  it("open field facing east sees the cone up to range 4", () => {
    const v = mazeVision(mk(), { position: p(1, 5), facing: "e" });

    expect(v.has("1:5")).toBe(true);
    expect(v.has("5:5")).toBe(true);
    expect(v.has("5:9")).toBe(true);
    expect(v.has("6:5")).toBe(false);
    expect(v.has("1:8")).toBe(false);
    expect(v.has("4:5")).toBe(true);
  });

  it("behind and to the side beyond 45 degrees are hidden, adjacent cells always seen", () => {
    const v = mazeVision(mk(), { position: p(1, 1), facing: "e" });

    expect(v.has("1:4")).toBe(false);
    expect(v.has("0:1")).toBe(true);
    expect(v.has("1:2")).toBe(true);
    expect(v.has("0:0")).toBe(true);
    expect(v.has("0:3")).toBe(false);
  });

  it("facing ne gives a diagonal cone", () => {
    const v = mazeVision(mk(), { position: p(2, 6), facing: "ne" });

    expect(v.has("5:3")).toBe(true);
    expect(v.has("6:2")).toBe(true);
    expect(v.has("1:2")).toBe(false);
    expect(v.has("6:7")).toBe(false);
  });

  it("a wall hides everything behind it in the row", () => {
    const v = mazeVision(mk(["1:0:e"]), { position: p(1, 0), facing: "e" });

    expect(v.has("2:0")).toBe(false);
    expect(v.has("4:0")).toBe(false);
  });

  it("diagonal neighbour behind a closed corner is hidden", () => {
    const v = mazeVision(mk(["0:0:e"]), { position: p(0, 0), facing: "se" });

    expect(v.has("1:0")).toBe(false);
    expect(v.has("1:1")).toBe(false);
    expect(v.has("0:1")).toBe(true);
  });

  it("fog at the viewer leaves only open neighbours and own cell", () => {
    const v = mazeVision(mk([], ["5:5"]), { position: p(5, 5), facing: "e" });

    expect(v.size).toBe(9);
    expect(v.has("5:5")).toBe(true);
    expect(v.has("8:5")).toBe(false);
  });

  it("stays inside the map", () => {
    const v = mazeVision(mk([], [], 3, 3), { position: p(0, 0), facing: "se" });

    for (const key of v) {
      const [x, y] = key.split(":").map(Number);

      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(3);
      expect(y).toBeLessThan(3);
    }
  });
});

describe("lineClear", () => {
  it("blocked by a wall on the path", () => {
    expect(lineClear(mk(["2:0:e"]), p(0, 0), p(4, 0))).toBe(false);
    expect(lineClear(mk(), p(0, 0), p(4, 0))).toBe(true);
  });
});

describe("seesParticipant", () => {
  const grid = mk([], ["2:0"]);

  const vision = mazeVision(grid, { position: p(0, 0), facing: "e" });

  it("hides a participant standing in fog at distance 2", () => {
    expect(seesParticipant(grid, vision, p(0, 0), p(2, 0))).toBe(false);
  });

  it("shows a participant in fog at distance 1", () => {
    const g = mk([], ["1:0"]);

    expect(seesParticipant(g, mazeVision(g, { position: p(0, 0), facing: "e" }), p(0, 0), p(1, 0))).toBe(true);
  });

  it("shows a participant in plain view and hides one outside vision", () => {
    expect(seesParticipant(grid, vision, p(0, 0), p(3, 0))).toBe(true);
    expect(seesParticipant(grid, vision, p(0, 0), p(0, 4))).toBe(false);
  });
});

describe("unionVision / viewpointOf", () => {
  it("unions cones", () => {
    const u = unionVision(mk(), [
      { position: p(5, 5), facing: "e" },
      { position: p(5, 5), facing: "w" },
    ]);

    expect(u.has("8:5")).toBe(true);
    expect(u.has("2:5")).toBe(true);
  });

  it("viewpointOf defaults facing to s and returns null without position", () => {
    expect(viewpointOf({ battleData: { position: p(1, 1) } } as never)).toEqual({ position: p(1, 1), facing: "s" });
    expect(viewpointOf({ battleData: {} } as never)).toBeNull();
  });
});
