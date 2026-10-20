import { describe, expect, it } from "vitest";

import { DIR_VECTORS, directionOf, inwardFacing } from "../direction";

const grid = { cols: 6, rows: 5 };

const p = (x: number, y: number) => ({ x, y });

describe("directionOf", () => {
  it("maps by sign of dx, dy", () => {
    expect(directionOf(p(2, 2), p(2, 1))).toBe("n");
    expect(directionOf(p(2, 2), p(3, 1))).toBe("ne");
    expect(directionOf(p(2, 2), p(3, 2))).toBe("e");
    expect(directionOf(p(2, 2), p(3, 3))).toBe("se");
    expect(directionOf(p(2, 2), p(2, 3))).toBe("s");
    expect(directionOf(p(2, 2), p(1, 3))).toBe("sw");
    expect(directionOf(p(2, 2), p(1, 2))).toBe("w");
    expect(directionOf(p(2, 2), p(1, 1))).toBe("nw");
  });

  it("uses the sign for far cells and null for same cell", () => {
    expect(directionOf(p(0, 0), p(5, 1))).toBe("se");
    expect(directionOf(p(1, 1), p(1, 1))).toBeNull();
  });
});

describe("DIR_VECTORS", () => {
  it("round-trips with directionOf", () => {
    for (const [d, v] of Object.entries(DIR_VECTORS)) expect(directionOf(p(3, 3), p(3 + v.x, 3 + v.y))).toBe(d);
  });
});

describe("inwardFacing", () => {
  it("corners face diagonally", () => {
    expect(inwardFacing(grid, p(0, 0))).toBe("se");
    expect(inwardFacing(grid, p(5, 0))).toBe("sw");
    expect(inwardFacing(grid, p(0, 4))).toBe("ne");
    expect(inwardFacing(grid, p(5, 4))).toBe("nw");
  });

  it("edges face inward", () => {
    expect(inwardFacing(grid, p(2, 0))).toBe("s");
    expect(inwardFacing(grid, p(2, 4))).toBe("n");
    expect(inwardFacing(grid, p(0, 2))).toBe("e");
    expect(inwardFacing(grid, p(5, 2))).toBe("w");
  });
});
