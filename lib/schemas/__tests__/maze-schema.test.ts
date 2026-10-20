import { describe, expect, it } from "vitest";

import { battleMapSchema, mazeSchema } from "../battles";

import { emptyMaze } from "@/lib/constants/battle";

const valid = {
  ...emptyMaze("hard"),
  walls: ["1:1:e", "2:3:s"],
  exit: { x: 5, y: 5 },
  teleports: [[{ x: 0, y: 0 }, { x: 9, y: 9 }]],
  fog: ["1:1"],
  marks: { "2:2": { symbol: "star", color: "#aabbcc", by: "p1" } },
  moved: true,
};

describe("mazeSchema", () => {
  it("accepts a valid maze and the empty one", () => {
    expect(mazeSchema.safeParse(valid).success).toBe(true);
    expect(mazeSchema.safeParse(emptyMaze()).success).toBe(true);
  });

  it("rejects a bad edge key", () => {
    expect(mazeSchema.safeParse({ ...valid, walls: ["1:1"] }).success).toBe(false);
    expect(mazeSchema.safeParse({ ...valid, walls: ["1:1:n"] }).success).toBe(false);
  });

  it("rejects a bad mark colour or symbol", () => {
    const mark = (m: object) => ({ ...valid, marks: { "2:2": { ...valid.marks["2:2"], ...m } } });

    expect(mazeSchema.safeParse(mark({ color: "#ABCDEF" })).success).toBe(false);
    expect(mazeSchema.safeParse(mark({ color: "red" })).success).toBe(false);
    expect(mazeSchema.safeParse(mark({ symbol: "heart" })).success).toBe(false);
    expect(mazeSchema.safeParse(mark({ by: "x".repeat(65) })).success).toBe(false);
  });

  it("rejects over-limit collections", () => {
    expect(mazeSchema.safeParse({ ...valid, walls: Array(7201).fill("1:1:e") }).success).toBe(false);
    expect(mazeSchema.safeParse({ ...valid, fog: Array(3601).fill("1:1") }).success).toBe(false);
    expect(mazeSchema.safeParse({ ...valid, teleports: Array(21).fill(valid.teleports[0]) }).success).toBe(false);

    const marks = Object.fromEntries(Array.from({ length: 3601 }, (_, i) => [`${i}:0`, valid.marks["2:2"]]));

    expect(mazeSchema.safeParse({ ...valid, marks }).success).toBe(false);
  });
});

describe("battleMapSchema.maze", () => {
  const map = { cols: 10, rows: 10, background: null, opacity: 0.35 };

  it("is optional and nullable", () => {
    expect(battleMapSchema.safeParse(map).success).toBe(true);
    expect(battleMapSchema.safeParse({ ...map, maze: null }).success).toBe(true);
    expect(battleMapSchema.safeParse({ ...map, maze: valid }).success).toBe(true);
    expect(battleMapSchema.safeParse({ ...map, maze: { ...valid, walls: ["x"] } }).success).toBe(false);
  });
});
