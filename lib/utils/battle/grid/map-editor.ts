import { cellKey, inBounds, isPlayable, marginCells, type Margins } from "./geometry";
import { applyTerrain } from "./terrain";

import type { BattleMapConfig, GridPoint } from "@/types/battle";

const NO_MARGINS: Margins = { top: 0, right: 0, bottom: 0, left: 0 };

function withBlocked(map: BattleMapConfig, keys: Iterable<string>): BattleMapConfig {
  const blocked = [...new Set(keys)];

  const { blocked: _old, ...rest } = map;

  return blocked.length ? { ...rest, blocked } : rest;
}

export function marginsBlocked(cols: number, rows: number, m: Margins): string[] {
  return marginCells({ cols, rows }, m);
}

export function inferMargins(map: BattleMapConfig): Margins {
  const blocked = new Set(map.blocked ?? []);

  if (!blocked.size) return { ...NO_MARGINS };

  const rowFull = (y: number) => Array.from({ length: map.cols }, (_, x) => x).every((x) => blocked.has(cellKey({ x, y })));

  const colFull = (x: number) => Array.from({ length: map.rows }, (_, y) => y).every((y) => blocked.has(cellKey({ x, y })));

  const run = (size: number, isFull: (i: number) => boolean, reverse: boolean) => {
    let n = 0;

    while (n < size && isFull(reverse ? size - 1 - n : n)) n++;

    return n;
  };

  return {
    top: run(map.rows, rowFull, false),
    bottom: run(map.rows, rowFull, true),
    left: run(map.cols, colFull, false),
    right: run(map.cols, colFull, true),
  };
}

export function toggleBlocked(map: BattleMapConfig, p: GridPoint): BattleMapConfig {
  if (!inBounds(map, p)) return map;

  const key = cellKey(p);

  const set = new Set(map.blocked ?? []);

  if (!set.delete(key)) set.add(key);

  return withBlocked(map, set);
}

export type SetupTool = "blocked" | "wall" | "hazard" | "erase";

export function paintCells(map: BattleMapConfig, cells: GridPoint[], tool: SetupTool, label?: string): BattleMapConfig {
  const keys = cells.filter((p) => inBounds(map, p)).map(cellKey);

  const blocked = new Set(map.blocked ?? []);

  for (const key of keys) {
    if (tool === "blocked") blocked.add(key);
    else blocked.delete(key);
  }

  const value = tool === "wall" ? { kind: "wall" as const } : tool === "hazard" ? { kind: "hazard" as const, ...(label && { label }) } : null;

  return applyTerrain(withBlocked(map, blocked), keys, value);
}

export function resizeMap(map: BattleMapConfig, cols: number, rows: number): BattleMapConfig {
  const next = { ...map, cols, rows };

  return withBlocked(
    next,
    (map.blocked ?? []).filter((k) => {
      const [x, y] = k.split(":").map(Number);

      return inBounds(next, { x, y });
    }),
  );
}

export function applyMargins(map: BattleMapConfig, m: Margins, prev: Margins = inferMargins(map)): BattleMapConfig {
  const old = new Set(marginsBlocked(map.cols, map.rows, prev));

  const drawn = (map.blocked ?? []).filter((k) => !old.has(k));

  return withBlocked(map, [...marginsBlocked(map.cols, map.rows, m), ...drawn]);
}

export const MIN_SIDE = 4;

export const MAX_SIDE = 40;

export const MAX_MARGIN = 10;

export const MIN_PLAYABLE = 2;

const OPPOSITE: Record<keyof Margins, keyof Margins> = { top: "bottom", bottom: "top", left: "right", right: "left" };

export const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export function marginLimit(map: Pick<BattleMapConfig, "cols" | "rows">, margins: Margins, key: keyof Margins): number {
  const span = key === "top" || key === "bottom" ? map.rows : map.cols;

  return clamp(span - margins[OPPOSITE[key]] - MIN_PLAYABLE, 0, MAX_MARGIN);
}

export function clampMargins(map: Pick<BattleMapConfig, "cols" | "rows">, margins: Margins): Margins {
  const next = { ...margins };

  for (const key of ["top", "bottom", "left", "right"] as const) next[key] = clamp(next[key], 0, marginLimit(map, next, key));

  return next;
}

export function hasPlayableArea(map: Pick<BattleMapConfig, "cols" | "rows" | "blocked" | "terrain">, side = MIN_PLAYABLE): boolean {
  for (let y = 0; y + side <= map.rows; y++) {
    for (let x = 0; x + side <= map.cols; x++) {
      let ok = true;

      for (let dy = 0; dy < side && ok; dy++) for (let dx = 0; dx < side && ok; dx++) ok = isPlayable(map, { x: x + dx, y: y + dy });

      if (ok) return true;
    }
  }

  return false;
}

const STORAGE_URL = /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/\S+$/;

export function isPreviewSafeBackground(src: string | null | undefined): src is string {
  if (!src) return false;

  return /^\/battle-maps\/[\w.-]+\.(webp|jpg|png)$/.test(src) || /^data:image\/(png|jpeg|webp);base64,/.test(src) || STORAGE_URL.test(src);
}
