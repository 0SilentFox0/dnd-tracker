import { DIR_VECTORS } from "./direction";

import { cellDistance, cellKey, inBounds } from "@/lib/utils/battle/grid/geometry";
import type { Direction8, GridPoint } from "@/types/battle";

type Grid = { cols: number; rows: number };

export type TunnelDir = "n" | "e" | "s" | "w";

export interface HeroTunnel {
  dir: TunnelDir;
  /** від центру (глухий кінець) до краю карти; остання клітинка — новий вихід */
  cells: GridPoint[];
  walls: string[];
  exit: GridPoint;
}

export const roomCentre = (grid: Grid): GridPoint => ({ x: Math.floor(grid.cols / 2), y: Math.floor(grid.rows / 2) });

const OPPOSITE: Record<TunnelDir, TunnelDir> = { n: "s", s: "n", e: "w", w: "e" };

const HORIZONTAL = new Set<TunnelDir>(["e", "w"]);

const ALL_DIRS: TunnelDir[] = ["w", "e", "n", "s"];

function cellsToEdge(grid: Grid, dir: TunnelDir): GridPoint[] {
  const step = DIR_VECTORS[dir];

  const out: GridPoint[] = [];

  for (let p = roomCentre(grid); inBounds(grid, p); p = { x: p.x + step.x, y: p.y + step.y }) out.push(p);

  return out;
}

/** Ребро між клітинкою та сусідом у напрямку dir; null — сусід поза картою (там рамка). */
function edgeToward(grid: Grid, p: GridPoint, dir: TunnelDir): string | null {
  const step = DIR_VECTORS[dir];

  const q = { x: p.x + step.x, y: p.y + step.y };

  if (!inBounds(grid, q)) return null;

  const first = step.x < 0 || step.y < 0 ? q : p;

  return `${cellKey(first)}:${HORIZONTAL.has(dir) ? "e" : "s"}`;
}

function build(grid: Grid, dir: TunnelDir): HeroTunnel {
  const cells = cellsToEdge(grid, dir);

  const sides: TunnelDir[] = HORIZONTAL.has(dir) ? ["n", "s"] : ["e", "w"];

  const walls = [edgeToward(grid, cells[0], OPPOSITE[dir]), ...cells.flatMap((c) => sides.map((s) => edgeToward(grid, c, s)))].filter((w): w is string => w !== null);

  return { dir, cells, walls: [...new Set(walls)].sort(), exit: cells[cells.length - 1] };
}

function exitDirs(grid: Grid, exit: GridPoint | null): TunnelDir[] {
  if (!exit) return [];

  const dirs: Array<TunnelDir | false> = [exit.x === 0 && "w", exit.x === grid.cols - 1 && "e", exit.y === 0 && "n", exit.y === grid.rows - 1 && "s"];

  return dirs.filter((d): d is TunnelDir => !!d);
}

const byLength = (grid: Grid, dirs: TunnelDir[]) => dirs.map((d) => build(grid, d)).sort((a, b) => b.cells.length - a.cells.length);

/**
 * Прямий тунель шириною в клітинку від центру карти до краю: глухий кінець за першим героєм, стіни обабіч, вихід на краю.
 * Напрямок — до краю старого виходу (у куті — довша вісь); якщо герої не влазять (клітинка виходу лишається вільною) —
 * протилежний край, далі інша вісь.
 */
export function heroTunnel(grid: Grid, oldExit: GridPoint | null, heroes: number): HeroTunnel | null {
  const preferred = byLength(grid, exitDirs(grid, oldExit));

  const opposite = preferred.length ? [build(grid, OPPOSITE[preferred[0].dir])] : [];

  const tried = new Set([...preferred, ...opposite].map((t) => t.dir));

  const ordered = [...preferred, ...opposite, ...byLength(grid, ALL_DIRS.filter((d) => !tried.has(d)))];

  return ordered.find((t) => t.cells.length - 1 >= heroes) ?? null;
}

export const tunnelFacing = (t: HeroTunnel): Direction8 => t.dir;

/** Найближча (за відстанню на сітці) вільна клітинка; null — немає. */
export function nearestFree(grid: Grid, from: GridPoint, blocked: ReadonlySet<string>): GridPoint | null {
  let best: GridPoint | null = null;

  for (let y = 0; y < grid.rows; y++) {
    for (let x = 0; x < grid.cols; x++) {
      const p = { x, y };

      if (blocked.has(cellKey(p))) continue;

      if (!best || cellDistance(from, p) < cellDistance(from, best)) best = p;
    }
  }

  return best;
}
