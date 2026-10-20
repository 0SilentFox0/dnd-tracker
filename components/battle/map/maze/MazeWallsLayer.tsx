"use client";

import { memo } from "react";

import { UNIT } from "@/lib/utils/battle/grid";
import { parseEdgeKey } from "@/lib/utils/battle/maze";
import type { MazeView } from "@/lib/utils/battle/view";
import type { BattleMapConfig } from "@/types/battle";

export const MAZE_WALL_WIDTH = 10;

const HALF = MAZE_WALL_WIDTH / 2;

/** Прямокутник ребра "x:y:e" / "x:y:s" із заокругленими кінцями, що заходять у кути. */
export function wallRect(edge: string): { x: number; y: number; width: number; height: number } {
  const { a, side } = parseEdgeKey(edge);

  if (side === "e") return { x: (a.x + 1) * UNIT - HALF, y: a.y * UNIT - HALF, width: MAZE_WALL_WIDTH, height: UNIT + MAZE_WALL_WIDTH };

  return { x: a.x * UNIT - HALF, y: (a.y + 1) * UNIT - HALF, width: UNIT + MAZE_WALL_WIDTH, height: MAZE_WALL_WIDTH };
}

interface Props {
  map: BattleMapConfig;
  view: MazeView | null | undefined;
}

export const MazeWallsLayer = memo(function MazeWallsLayer({ map, view }: Props) {
  const walls = map.maze?.walls;

  if (!walls) return null;

  const shown = view ? walls.filter(view.showWalls) : walls;

  return (
    <g pointerEvents="none" data-maze-walls="">
      <rect className="maze-frame" data-maze-frame="" x={0} y={0} width={map.cols * UNIT} height={map.rows * UNIT} strokeWidth={MAZE_WALL_WIDTH * 2} />
      {shown.map((edge) => (
        <rect key={edge} className="maze-wall" data-maze-wall={edge} {...wallRect(edge)} rx={HALF} ry={HALF} />
      ))}
    </g>
  );
});
