import { describe, expect, it } from "vitest";

import { mulberry32 } from "../rng";
import { scatterAll, scatterStarts } from "../scatter";
import { isEdgeCell } from "../walls";
import { mazeGrid } from "./fixtures";

import { cellDistance, cellKey } from "@/lib/utils/battle/grid/geometry";
import { MAZE_SCATTER_MIN_GAP } from "@/lib/utils/battle/modes/maze/constants";
import type { MazeConfig } from "@/types/battle";

const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`);

const grid = (cols: number, rows: number, maze: Partial<MazeConfig> = {}) => mazeGrid(maze, cols, rows);

describe("scatterStarts", () => {
  it("distinct edge cells, never the exit", () => {
    const g = grid(6, 4, { exit: { x: 0, y: 0 } });

    for (let seed = 0; seed < 20; seed++) {
      const out = scatterStarts(g, ids(15), mulberry32(seed)) as Record<string, { x: number; y: number }>;

      const cells = Object.values(out);

      expect(cells).toHaveLength(15);
      expect(new Set(cells.map(cellKey)).size).toBe(15);
      expect(cells.every((c) => isEdgeCell(g, c))).toBe(true);
      expect(cells.some((c) => c.x === 0 && c.y === 0)).toBe(false);
    }
  });

  it("null when there are more heroes than edge cells", () => {
    expect(scatterStarts(grid(3, 3, { exit: { x: 0, y: 0 } }), ids(8), mulberry32(1))).toBeNull();
  });
});

describe("scatterAll", () => {
  it("keeps the gap, avoids exit and teleports", () => {
    const g = grid(20, 12, { exit: { x: 0, y: 5 }, teleports: [[{ x: 3, y: 3 }, { x: 10, y: 10 }]] });

    for (let seed = 0; seed < 20; seed++) {
      const cells = Object.values(scatterAll(g, ids(10), mulberry32(seed)) ?? {});

      expect(cells).toHaveLength(10);

      for (let i = 0; i < cells.length; i++) {
        for (let j = i + 1; j < cells.length; j++) expect(cellDistance(cells[i], cells[j])).toBeGreaterThanOrEqual(MAZE_SCATTER_MIN_GAP + 1);
      }

      expect(cells.map(cellKey)).not.toContain("0:5");
      expect(cells.map(cellKey)).not.toContain("3:3");
      expect(cells.map(cellKey)).not.toContain("10:10");
    }
  });

  it("fits many participants on a roomy map", () => {
    expect(Object.keys(scatterAll(grid(40, 30), ids(30), mulberry32(5)) ?? {})).toHaveLength(30);
  });

  it("two participants are at least 3 apart", () => {
    for (let seed = 0; seed < 20; seed++) {
      const [a, b] = Object.values(scatterAll(grid(4, 4), ids(2), mulberry32(seed)) ?? {});

      expect(cellDistance(a, b)).toBeGreaterThanOrEqual(3);
    }
  });

  it("null quickly when there is no room", () => {
    const start = performance.now();

    expect(scatterAll(grid(6, 4), ids(8), mulberry32(3))).toBeNull();
    expect(performance.now() - start).toBeLessThan(100);
  });
});

describe("розкидання стартів повз телепорти", () => {
  it("герої не стають на телепорт (3×3: рівно 5 вільних крайніх клітинок)", () => {
    const g = grid(3, 3, { exit: { x: 2, y: 0 }, teleports: [[{ x: 0, y: 1 }, { x: 1, y: 2 }]] });

    for (let seed = 0; seed < 30; seed++) {
      const starts = scatterStarts(g, ["a", "b", "c", "d", "e"], mulberry32(seed));

      expect(starts).not.toBeNull();
      expect(Object.values(starts ?? {}).map(cellKey)).not.toContain("0:1");
      expect(Object.values(starts ?? {}).map(cellKey)).not.toContain("1:2");
    }
  });
});
