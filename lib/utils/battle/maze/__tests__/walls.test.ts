import { describe, expect, it } from "vitest";

import { allInteriorEdges, canStep, cornerOpen, edgeKey, hasWall, isEdgeCell, mazeNeighbors, wallSet } from "../walls";

const grid = { cols: 5, rows: 4 };

const p = (x: number, y: number) => ({ x, y });

const set = (...w: string[]) => new Set(w);

describe("edgeKey", () => {
  it("canonical key for orthogonal neighbours, either order", () => {
    expect(edgeKey(p(1, 1), p(2, 1))).toBe("1:1:e");
    expect(edgeKey(p(2, 1), p(1, 1))).toBe("1:1:e");
    expect(edgeKey(p(1, 1), p(1, 2))).toBe("1:1:s");
    expect(edgeKey(p(1, 2), p(1, 1))).toBe("1:1:s");
  });

  it("null for diagonal or distant cells", () => {
    expect(edgeKey(p(1, 1), p(2, 2))).toBeNull();
    expect(edgeKey(p(1, 1), p(3, 1))).toBeNull();
    expect(edgeKey(p(1, 1), p(1, 1))).toBeNull();
  });
});

describe("wallSet", () => {
  it("caches per array", () => {
    const walls = ["1:1:e"];

    expect(wallSet({ walls })).toBe(wallSet({ walls }));
    expect(wallSet({ walls }).has("1:1:e")).toBe(true);
    expect(wallSet({ walls: [] }).size).toBe(0);
  });
});

describe("hasWall", () => {
  it("border is a wall", () => {
    expect(hasWall(grid, set(), p(0, 0), p(-1, 0))).toBe(true);
    expect(hasWall(grid, set(), p(4, 3), p(5, 3))).toBe(true);
    expect(hasWall(grid, set(), p(4, 3), p(4, 4))).toBe(true);
  });

  it("edge wall blocks both ways", () => {
    const w = set("1:1:e");

    expect(hasWall(grid, w, p(1, 1), p(2, 1))).toBe(true);
    expect(hasWall(grid, w, p(2, 1), p(1, 1))).toBe(true);
    expect(hasWall(grid, w, p(1, 1), p(1, 2))).toBe(false);
  });
});

describe("cornerOpen / canStep", () => {
  it.each(["1:1:e", "1:1:s", "2:1:s", "1:2:e"])("diagonal (1,1)->(2,2) closed by %s", (k) => {
    expect(cornerOpen(grid, set(k), p(1, 1), p(2, 2))).toBe(false);
    expect(canStep(grid, set(k), p(2, 2), p(1, 1))).toBe(false);
  });

  it("diagonal open without walls, also next to the border", () => {
    expect(cornerOpen(grid, set(), p(1, 1), p(2, 2))).toBe(true);
    expect(canStep(grid, set(), p(0, 0), p(1, 1))).toBe(true);
  });

  it("anti-diagonal checks its own corner", () => {
    expect(canStep(grid, set("2:2:e"), p(2, 1), p(1, 2))).toBe(true);
    expect(canStep(grid, set("1:1:e"), p(2, 1), p(1, 2))).toBe(false);
  });

  it("orthogonal respects walls, out of bounds never", () => {
    expect(canStep(grid, set("1:1:e"), p(1, 1), p(2, 1))).toBe(false);
    expect(canStep(grid, set(), p(1, 1), p(2, 1))).toBe(true);
    expect(canStep(grid, set(), p(0, 0), p(-1, -1))).toBe(false);
  });

  it("non-adjacent cells are not steps", () => {
    expect(canStep(grid, set(), p(1, 1), p(3, 1))).toBe(false);
  });
});

describe("isEdgeCell / allInteriorEdges / mazeNeighbors", () => {
  it("detects border cells", () => {
    expect(isEdgeCell(grid, p(0, 2))).toBe(true);
    expect(isEdgeCell(grid, p(4, 1))).toBe(true);
    expect(isEdgeCell(grid, p(2, 0))).toBe(true);
    expect(isEdgeCell(grid, p(2, 3))).toBe(true);
    expect(isEdgeCell(grid, p(2, 1))).toBe(false);
  });

  it("lists every interior edge once", () => {
    const edges = allInteriorEdges(grid);

    expect(edges).toHaveLength((5 - 1) * 4 + 5 * (4 - 1));
    expect(new Set(edges).size).toBe(edges.length);
    expect(edges).toContain("3:0:e");
    expect(edges).not.toContain("4:0:e");
    expect(edges).not.toContain("0:3:s");
  });

  it("neighbours skip walls and the border", () => {
    expect(mazeNeighbors(grid, set(), p(0, 0))).toHaveLength(3);
    expect(mazeNeighbors(grid, set("0:0:e"), p(0, 0))).toEqual([p(0, 1)]);
    expect(mazeNeighbors(grid, set(), p(2, 1))).toHaveLength(8);
  });
});
