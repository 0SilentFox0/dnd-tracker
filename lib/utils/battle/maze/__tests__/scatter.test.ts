import { describe, expect, it } from "vitest";

import { mulberry32 } from "../rng";
import { scatterAll, scatterStarts } from "../scatter";
import { isEdgeCell } from "../walls";

import { emptyMaze, MAZE_SCATTER_MIN_GAP } from "@/lib/constants/battle";
import { cellDistance, cellKey } from "@/lib/utils/battle/grid/geometry";
import type { MazeConfig } from "@/types/battle";

const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`);

const grid = (cols: number, rows: number, maze: Partial<MazeConfig> = {}) => ({ cols, rows, maze: { ...emptyMaze(), ...maze } });

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
        for (let j = i + 1; j < cells.length; j++) expect(cellDistance(cells[i], cells[j])).toBeGreaterThanOrEqual(MAZE_SCATTER_MIN_GAP);
      }

      expect(cells.map(cellKey)).not.toContain("0:5");
      expect(cells.map(cellKey)).not.toContain("3:3");
      expect(cells.map(cellKey)).not.toContain("10:10");
    }
  });

  it("null quickly when there is no room", () => {
    const start = performance.now();

    expect(scatterAll(grid(6, 4), ids(8), mulberry32(3))).toBeNull();
    expect(performance.now() - start).toBeLessThan(100);
  });
});
