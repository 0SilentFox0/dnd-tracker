"use client";

import { memo, useId } from "react";

import { parseCellKey, UNIT } from "@/lib/utils/battle/grid";
import type { MazeView } from "@/lib/utils/battle/view";
import type { BattleMapConfig } from "@/types/battle";

interface Props {
  map: BattleMapConfig;
  view: MazeView | null | undefined;
}

/** Чорна заливка всієї карти з «дірками» в полі зору; без пам'яті — решта карти просто чорна. */
export const MazeFogOfWar = memo(function MazeFogOfWar({ map, view }: Props) {
  const id = `maze-fow-${useId().replace(/:/g, "")}`;

  const cells = view?.cells;

  if (!map.maze || !cells) return null;

  const width = map.cols * UNIT;

  const height = map.rows * UNIT;

  return (
    <g pointerEvents="none" data-maze-fow-layer="">
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x={0} y={0} width={width} height={height}>
          <rect x={0} y={0} width={width} height={height} fill="white" />
          {[...cells].map((key) => {
            const { x, y } = parseCellKey(key);

            return <rect key={key} data-maze-visible={key} x={x * UNIT} y={y * UNIT} width={UNIT} height={UNIT} fill="black" />;
          })}
        </mask>
      </defs>
      <rect data-maze-fow={id} x={0} y={0} width={width} height={height} fill="#000" mask={`url(#${id})`} />
    </g>
  );
});
