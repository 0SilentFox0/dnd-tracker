import { blockedSet, cellKey, footprint } from "./geometry";
import { sizeOf } from "./occupancy";

import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

export const UNIT = 100;

const R = UNIT / 2;

export function mapSize(map: Pick<BattleMapConfig, "cols" | "rows">): { width: number; height: number } {
  return { width: map.cols * UNIT, height: map.rows * UNIT };
}

/** a…f екранної матриці SVG (`svg.getScreenCTM()`), яка вже містить зум, зсув і поворот карти */
export interface ScreenMatrix {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export function cellAtScreenPoint(map: Pick<BattleMapConfig, "cols" | "rows">, ctm: ScreenMatrix, clientX: number, clientY: number): GridPoint | null {
  const det = ctm.a * ctm.d - ctm.b * ctm.c;

  if (!det) return null;

  const dx = clientX - ctm.e;

  const dy = clientY - ctm.f;

  const x = Math.floor((ctm.d * dx - ctm.c * dy) / det / UNIT);

  const y = Math.floor((ctm.a * dy - ctm.b * dx) / det / UNIT);

  return x >= 0 && y >= 0 && x < map.cols && y < map.rows ? { x, y } : null;
}

export function cellCenter(p: GridPoint): { x: number; y: number } {
  return { x: (p.x + 0.5) * UNIT, y: (p.y + 0.5) * UNIT };
}

export function cellPolygon(p: GridPoint): string {
  const c = cellCenter(p);

  const corners = [[c.x - R, c.y - R], [c.x + R, c.y - R], [c.x + R, c.y + R], [c.x - R, c.y + R]];

  return corners.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}

export function tokenBox(p: BattleParticipant): { cx: number; cy: number; size: number } | null {
  const anchor = p.battleData.position;

  if (!anchor) return null;

  const size = sizeOf(p);

  const cells = footprint(anchor, size).map(cellCenter);

  const cx = cells.reduce((s, c) => s + c.x, 0) / cells.length;

  const cy = cells.reduce((s, c) => s + c.y, 0) / cells.length;

  return { cx, cy, size: size * UNIT * 0.86 };
}

export function fitMapBox(avail: { width: number; height: number }, map: Pick<BattleMapConfig, "cols" | "rows">): { width: number; height: number } {
  const ratio = map.cols / map.rows;

  return { width: Math.min(avail.width, avail.height * ratio), height: Math.min(avail.height, avail.width / ratio) };
}

export interface MapView {
  width: number;
  height: number;
  rotated: boolean;
}

// карта лягає вертикально, лише коли вона помітно ширша, ніж висока
const ROTATE_MIN_RATIO = 1.15;

/** найменша клітинка на екрані, яку ще можна влучно тапнути пальцем */
export const MIN_TAP_CELL_PX = 30;

/**
 * рамка карти на екрані; rotated — карта повернута на 90° за годинниковою, width/height уже переставлені;
 * fillWidth — рамка на всю ширину, висота може перевищити доступну (тоді її прокручують);
 * minCell — рамка росте, щоб клітинка була не меншою, і тоді прокручується в обидва боки
 */
export function fitMapView(
  avail: { width: number; height: number },
  map: Pick<BattleMapConfig, "cols" | "rows">,
  { rotatable = false, fillWidth = false, minCell = 0 }: { rotatable?: boolean; fillWidth?: boolean; minCell?: number } = {},
): MapView {
  // за орієнтацією, а не за виграшем площі: інакше карта перекидається, коли панель знизу росте
  const rotated = rotatable && avail.height > avail.width && map.cols >= map.rows * ROTATE_MIN_RATIO;

  const shown = rotated ? { cols: map.rows, rows: map.cols } : map;

  const box = fillWidth ? { width: avail.width, height: (avail.width * shown.rows) / shown.cols } : fitMapBox(avail, shown);

  const grow = box.width > 0 ? Math.max(1, (minCell * shown.cols) / box.width) : 1;

  return { width: box.width * grow, height: box.height * grow, rotated };
}

export type GridWindow = { x: number; y: number; cols: number; rows: number };

/** найменший прямокутник з усіма ігровими клітинками; стіни ігрові, неігрові лише blocked */
export function playableBounds(map: Pick<BattleMapConfig, "cols" | "rows" | "blocked">): GridWindow {
  const blocked = blockedSet(map);

  let x0 = map.cols, y0 = map.rows, x1 = -1, y1 = -1;

  for (let y = 0; y < map.rows; y++) {
    for (let x = 0; x < map.cols; x++) {
      if (blocked.has(cellKey({ x, y }))) continue;

      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  }

  return x1 < 0 ? { x: 0, y: 0, cols: map.cols, rows: map.rows } : { x: x0, y: y0, cols: x1 - x0 + 1, rows: y1 - y0 + 1 };
}
