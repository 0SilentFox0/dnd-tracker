import type { BattleMapConfig, MazeConfig } from "@/types/battle";

export type GridSize = { cols: number; rows: number };

export interface MazeGrid extends GridSize {
  maze: MazeConfig;
}

export function mazeGridOf(map: BattleMapConfig | null | undefined): MazeGrid | null {
  return map?.maze ? { cols: map.cols, rows: map.rows, maze: map.maze } : null;
}


const EMPTY_SET: ReadonlySet<string> = new Set();

const fogCache = new WeakMap<string[], Set<string>>();

export function fogSet(maze: Pick<MazeConfig, "fog">): ReadonlySet<string> {
  const list = maze.fog;

  if (!list?.length) return EMPTY_SET;

  let set = fogCache.get(list);

  if (!set) {
    set = new Set(list);
    fogCache.set(list, set);
  }

  return set;
}
