import { describe, expect, it } from "vitest";

import { emptyMaze } from "@/lib/constants/battle";
import { cellDistance, cellKey } from "@/lib/utils/battle/grid/geometry";
import { allReachExit, clusterAt, roomCentre, tunnelRoom } from "@/lib/utils/battle/maze";
import type { GridPoint } from "@/types/battle";

const grid = { cols: 11, rows: 9 };

const exits: Array<[string, GridPoint]> = [
  ["лівий край", { x: 0, y: 2 }],
  ["правий край", { x: 10, y: 6 }],
  ["верхній край", { x: 3, y: 0 }],
  ["нижній край", { x: 8, y: 8 }],
];

describe("tunnelRoom", () => {
  it.each(exits)("%s: прямий тунель від виходу до центру, стіни лише вздовж нього", (_, exit) => {
    const { walls, cells, mouth } = tunnelRoom(grid, exit);

    const c = roomCentre(grid);

    expect(cells[0].x === exit.x || cells[0].y === exit.y).toBe(true);
    expect(cells.some((p) => cellKey(p) === cellKey(exit))).toBe(true);

    const horizontal = exit.x === 0 || exit.x === grid.cols - 1;

    expect(cells.every((p) => (horizontal ? p.y === exit.y : p.x === exit.x))).toBe(true);
    expect(mouth).toEqual(horizontal ? { x: c.x, y: exit.y } : { x: exit.x, y: c.y });
    expect(cells.every((p) => cellDistance(p, mouth) >= 1)).toBe(true);
    expect(cellDistance(cells.reduce((a, b) => (cellDistance(a, mouth) < cellDistance(b, mouth) ? a : b)), mouth)).toBe(1);

    const tunnel = new Set(cells.map(cellKey));

    for (const w of walls) {
      const [x, y, side] = w.split(":");

      const a = { x: Number(x), y: Number(y) };

      const b = side === "e" ? { x: a.x + 1, y: a.y } : { x: a.x, y: a.y + 1 };

      expect(tunnel.has(cellKey(a)) !== tunnel.has(cellKey(b))).toBe(true);
      expect(side).toBe(horizontal ? "s" : "e");
    }

    expect(walls.length).toBe(cells.length * 2);
  });

  it.each(exits)("%s: героїв скупчено біля центру поза тунелем, усі доходять до виходу", (_, exit) => {
    const { walls, cells } = tunnelRoom(grid, exit);

    const maze = { cols: grid.cols, rows: grid.rows, maze: { ...emptyMaze(), walls, exit } };

    const blocked = new Set(cells.map(cellKey));

    const spots = clusterAt(maze, roomCentre(grid), 5, blocked)!;

    expect(spots).toHaveLength(5);
    expect(spots.some((p) => blocked.has(cellKey(p)))).toBe(false);
    expect(new Set(spots.map(cellKey)).size).toBe(5);
    expect(spots.every((p) => cellDistance(p, roomCentre(grid)) <= 1)).toBe(true);
    expect(allReachExit(maze, spots)).toBe(true);
  });
});

describe("clusterAt", () => {
  it("обходить заблоковані клітинки й повертає null, коли місця не вистачає", () => {
    const maze = { cols: 3, rows: 3, maze: emptyMaze() };

    const blocked = new Set(["1:1", "0:0"]);

    const spots = clusterAt(maze, { x: 1, y: 1 }, 7, blocked)!;

    expect(spots.map(cellKey)).not.toContain("1:1");
    expect(spots).toHaveLength(7);
    expect(clusterAt(maze, { x: 1, y: 1 }, 8, blocked)).toBeNull();
  });
});
