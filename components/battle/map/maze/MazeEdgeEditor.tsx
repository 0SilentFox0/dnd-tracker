"use client";

import { memo, useEffect, useMemo } from "react";

import type { MazeEditing } from "@/lib/hooks/battle";
import { UNIT } from "@/lib/utils/battle/grid";
import { allInteriorEdges } from "@/lib/utils/battle/maze";
import type { BattleMapConfig } from "@/types/battle";

const BAND = 30;

const INSET = 12;

/** Зона кліку вздовж ребра: вужча за клітинку й коротша за ребро, щоб центр і кути лишались вільними. */
export function edgeHitRect(edge: string): { x: number; y: number; width: number; height: number } {
  const [x, y, side] = edge.split(":");

  const cx = Number(x);

  const cy = Number(y);

  if (side === "e") return { x: (cx + 1) * UNIT - BAND / 2, y: cy * UNIT + INSET, width: BAND, height: UNIT - INSET * 2 };

  return { x: cx * UNIT + INSET, y: (cy + 1) * UNIT - BAND / 2, width: UNIT - INSET * 2, height: BAND };
}

interface Props {
  map: Pick<BattleMapConfig, "cols" | "rows">;
  editing: MazeEditing;
}

export const MazeEdgeEditor = memo(function MazeEdgeEditor({ map, editing }: Props) {
  const { tool, stroke, picked } = editing;

  const { cols, rows } = map;

  const edges = useMemo(() => allInteriorEdges({ cols, rows }), [cols, rows]);

  const walls = tool === "walls";

  const { end } = stroke;

  useEffect(() => {
    if (!walls) return;

    window.addEventListener("pointerup", end);

    return () => window.removeEventListener("pointerup", end);
  }, [walls, end]);

  return (
    <g data-maze-editor={tool}>
      {picked && (
        <rect data-maze-picked="" x={picked.x * UNIT} y={picked.y * UNIT} width={UNIT} height={UNIT} fill="rgba(168,120,255,.35)" stroke="#c4a6ff" strokeWidth={3} vectorEffect="non-scaling-stroke" pointerEvents="none" />
      )}
      {walls &&
        edges.map((edge) => (
          <rect
            key={edge}
            data-maze-edge={edge}
            {...edgeHitRect(edge)}
            rx={BAND / 2}
            className={stroke.pending.has(edge) ? "fill-[rgba(242,193,78,.55)]" : "fill-transparent hover:fill-[rgba(242,193,78,.35)]"}
            style={{ cursor: "crosshair" }}
            onPointerDown={(e) => {
              if (e.button !== 0) return;

              // інакше дотик захоплює вказівник і сусідні ребра не отримують pointerenter
              (e.target as Element).releasePointerCapture?.(e.pointerId);
              stroke.begin(edge);
            }}
            onPointerEnter={() => stroke.enter(edge)}
          />
        ))}
    </g>
  );
});
