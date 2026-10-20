import { mapCentre } from "@/lib/utils/battle/grid/geometry";
import type { Direction8, GridPoint } from "@/types/battle";

export const DIR_VECTORS: Record<Direction8, GridPoint> = {
  n: { x: 0, y: -1 },
  ne: { x: 1, y: -1 },
  e: { x: 1, y: 0 },
  se: { x: 1, y: 1 },
  s: { x: 0, y: 1 },
  sw: { x: -1, y: 1 },
  w: { x: -1, y: 0 },
  nw: { x: -1, y: -1 },
};

const BY_VECTOR = new Map<string, Direction8>((Object.keys(DIR_VECTORS) as Direction8[]).map((d) => [`${DIR_VECTORS[d].x}:${DIR_VECTORS[d].y}`, d]));

export function directionOf(from: GridPoint, to: GridPoint): Direction8 | null {
  const key = `${Math.sign(to.x - from.x)}:${Math.sign(to.y - from.y)}`;

  return BY_VECTOR.get(key) ?? null;
}

export function inwardFacing(grid: { cols: number; rows: number }, p: GridPoint): Direction8 {
  const dx = p.x === 0 ? 1 : p.x === grid.cols - 1 ? -1 : 0;

  const dy = p.y === 0 ? 1 : p.y === grid.rows - 1 ? -1 : 0;

  if (dx === 0 && dy === 0) return directionOf(p, mapCentre(grid)) ?? "s";

  return BY_VECTOR.get(`${dx}:${dy}`) as Direction8;
}
