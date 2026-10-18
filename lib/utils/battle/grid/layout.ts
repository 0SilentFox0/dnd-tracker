import { footprint } from "./geometry";
import { sizeOf } from "./occupancy";

import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

export const UNIT = 100;

const R = UNIT / 2;

export function mapSize(map: Pick<BattleMapConfig, "cols" | "rows">): { width: number; height: number } {
  return { width: map.cols * UNIT, height: map.rows * UNIT };
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
