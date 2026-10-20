import { describe, expect, it } from "vitest";

import { mazeGrid } from "./fixtures";

import { cellKey, mapCentre, neighbors } from "@/lib/utils/battle/grid/geometry";
import { canStep, heroTunnel, mazeDistances, wallSet } from "@/lib/utils/battle/modes/maze";
import type { GridPoint } from "@/types/battle";

const grid = { cols: 11, rows: 9 };

const c = mapCentre(grid);

const exits: Array<[string, GridPoint, "w" | "e" | "n" | "s", GridPoint]> = [
  ["лівий край", { x: 0, y: 2 }, "w", { x: 0, y: c.y }],
  ["правий край", { x: 10, y: 6 }, "e", { x: 10, y: c.y }],
  ["верхній край", { x: 3, y: 0 }, "n", { x: c.x, y: 0 }],
  ["нижній край", { x: 8, y: 8 }, "s", { x: c.x, y: 8 }],
];

const tunnelGrid = (walls: string[], exit: GridPoint) => mazeGrid({ walls, exit }, grid.cols, grid.rows);

describe("heroTunnel", () => {
  it.each(exits)("%s: прямий тунель від центру до того ж краю, вихід перенесено на його кінець", (_, oldExit, dir, newExit) => {
    const t = heroTunnel(grid, oldExit, 3)!;

    expect(t.dir).toBe(dir);
    expect(t.cells[0]).toEqual(c);
    expect(t.exit).toEqual(newExit);
    expect(t.cells.at(-1)).toEqual(newExit);

    const horizontal = dir === "w" || dir === "e";

    expect(t.cells.every((p) => (horizontal ? p.y === c.y : p.x === c.x))).toBe(true);
  });

  it.each(exits)("%s: шлях до виходу лише вздовж тунелю, сусіди поза тунелем відгороджені", (_, oldExit) => {
    const t = heroTunnel(grid, oldExit, 3)!;

    const g = tunnelGrid(t.walls, t.exit);

    const walls = wallSet(g.maze);

    const inside = new Set(t.cells.map(cellKey));

    for (const p of t.cells) {
      for (const n of neighbors(p)) {
        if (n.x < 0 || n.y < 0 || n.x >= grid.cols || n.y >= grid.rows || inside.has(cellKey(n))) continue;

        expect(canStep(g, walls, p, n)).toBe(false);
      }
    }

    const reach = mazeDistances(g, [t.exit]);

    expect(t.cells.every((p) => reach.has(cellKey(p)))).toBe(true);
    expect([...reach.keys()].every((k) => inside.has(k))).toBe(true);
  });

  it("кутовий вихід — довша вісь", () => {
    expect(heroTunnel({ cols: 15, rows: 7 }, { x: 0, y: 0 }, 2)!.dir).toBe("w");
    expect(heroTunnel({ cols: 7, rows: 15 }, { x: 0, y: 0 }, 2)!.dir).toBe("n");
  });

  it("мала карта: герої впритул влазять, клітинка виходу лишається вільною", () => {
    const small = { cols: 7, rows: 7 };

    const t = heroTunnel(small, { x: 0, y: 3 }, 3)!;

    expect(t.dir).toBe("w");
    expect(t.cells).toHaveLength(4);
  });

  it("героїв більше, ніж клітинок до старого краю — протилежний край, далі інша вісь", () => {
    const wide = { cols: 12, rows: 5 };

    expect(heroTunnel(wide, { x: 11, y: 2 }, 6)!.dir).toBe("w");
    expect(heroTunnel({ cols: 5, rows: 12 }, { x: 0, y: 2 }, 6)!.dir).toBe("n");
    expect(heroTunnel({ cols: 5, rows: 5 }, { x: 0, y: 2 }, 6)).toBeNull();
  });
});
