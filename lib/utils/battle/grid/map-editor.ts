import { cellKey, inBounds, marginCells,type Margins } from "./geometry";

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
