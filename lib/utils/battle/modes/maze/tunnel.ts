import { DIR_VECTORS } from "./direction";
import type { GridSize } from "./grid";
import { edgeKey } from "./walls";

import { cellKey, cellsByDistance, inBounds, mapCentre } from "@/lib/utils/battle/grid/geometry";
import type { GridPoint } from "@/types/battle";

export type TunnelDir = "n" | "e" | "s" | "w";

export interface HeroTunnel {
  dir: TunnelDir;
  /** від центру (глухий кінець) до краю карти; остання клітинка — новий вихід */
  cells: GridPoint[];
  walls: string[];
  exit: GridPoint;
}

const OPPOSITE: Record<TunnelDir, TunnelDir> = { n: "s", s: "n", e: "w", w: "e" };

const HORIZONTAL = new Set<TunnelDir>(["e", "w"]);

const ALL_DIRS: TunnelDir[] = ["w", "e", "n", "s"];

function cellsToEdge(grid: GridSize, dir: TunnelDir): GridPoint[] {
  const step = DIR_VECTORS[dir];

  const out: GridPoint[] = [];

  for (let p = mapCentre(grid); inBounds(grid, p); p = { x: p.x + step.x, y: p.y + step.y }) out.push(p);

  return out;
}

/** null — сусід поза картою (там рамка). */
function edgeToward(grid: GridSize, p: GridPoint, dir: TunnelDir): string | null {
  const step = DIR_VECTORS[dir];

  const q = { x: p.x + step.x, y: p.y + step.y };

  return inBounds(grid, q) ? edgeKey(p, q) : null;
}

function build(grid: GridSize, dir: TunnelDir): HeroTunnel {
  const cells = cellsToEdge(grid, dir);

  const sides: TunnelDir[] = HORIZONTAL.has(dir) ? ["n", "s"] : ["e", "w"];

  const walls = [edgeToward(grid, cells[0], OPPOSITE[dir]), ...cells.flatMap((c) => sides.map((s) => edgeToward(grid, c, s)))].filter((w): w is string => w !== null);

  return { dir, cells, walls: [...new Set(walls)].sort(), exit: cells[cells.length - 1] };
}

function exitDirs(grid: GridSize, exit: GridPoint | null): TunnelDir[] {
  if (!exit) return [];

  const dirs: Array<TunnelDir | false> = [exit.x === 0 && "w", exit.x === grid.cols - 1 && "e", exit.y === 0 && "n", exit.y === grid.rows - 1 && "s"];

  return dirs.filter((d): d is TunnelDir => !!d);
}

const byLength = (grid: GridSize, dirs: TunnelDir[]) => dirs.map((d) => build(grid, d)).sort((a, b) => b.cells.length - a.cells.length);

/**
 * Прямий тунель шириною в клітинку від центру карти до краю: глухий кінець за першим героєм, стіни обабіч, вихід на краю.
 * Напрямок — до краю старого виходу (у куті — довша вісь); якщо герої не влазять (клітинка виходу лишається вільною) —
 * протилежний край, далі інша вісь.
 */
export function heroTunnel(grid: GridSize, oldExit: GridPoint | null, heroes: number): HeroTunnel | null {
  const preferred = byLength(grid, exitDirs(grid, oldExit));

  const opposite = preferred.length ? [build(grid, OPPOSITE[preferred[0].dir])] : [];

  const tried = new Set([...preferred, ...opposite].map((t) => t.dir));

  const ordered = [...preferred, ...opposite, ...byLength(grid, ALL_DIRS.filter((d) => !tried.has(d)))];

  return ordered.find((t) => t.cells.length - 1 >= heroes) ?? null;
}

export function nearestFree(grid: GridSize, from: GridPoint, blocked: ReadonlySet<string>): GridPoint | null {
  return cellsByDistance(grid, from).find((p) => !blocked.has(cellKey(p))) ?? null;
}
