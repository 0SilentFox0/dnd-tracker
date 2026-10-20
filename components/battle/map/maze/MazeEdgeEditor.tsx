"use client";

import { memo, type PointerEvent, useEffect, useMemo } from "react";

import type { MazeEditing } from "@/lib/hooks/battle";
import { UNIT } from "@/lib/utils/battle/grid";
import { allInteriorEdges, parseEdgeKey } from "@/lib/utils/battle/modes/maze";
import type { BattleMapConfig } from "@/types/battle";

const BAND = 30;

const INSET = 12;

/** Зона кліку вздовж ребра: вужча за клітинку й коротша за ребро, щоб центр і кути лишались вільними. */
export function edgeHitRect(edge: string): { x: number; y: number; width: number; height: number } {
  const { a, side } = parseEdgeKey(edge);

  if (side === "e") return { x: (a.x + 1) * UNIT - BAND / 2, y: a.y * UNIT + INSET, width: BAND, height: UNIT - INSET * 2 };

  return { x: a.x * UNIT + INSET, y: (a.y + 1) * UNIT - BAND / 2, width: UNIT - INSET * 2, height: BAND };
}

const edgeOf = (e: PointerEvent) => (e.target as Element).getAttribute("data-maze-edge");

interface HitsProps {
  edges: string[];
  begin(edge: string): void;
  enter(edge: string): void;
}

// ~7 000 зон на 60×60: рендеряться лише при зміні розміру карти, обробники делеговані на групу
const EdgeHits = memo(function EdgeHits({ edges, begin, enter }: HitsProps) {
  const onPointerDown = (e: PointerEvent) => {
    const edge = edgeOf(e);

    if (e.button !== 0 || !edge) return;

    // інакше дотик захоплює вказівник і сусідні ребра не отримують pointerover
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    begin(edge);
  };

  const onPointerOver = (e: PointerEvent) => {
    const edge = edgeOf(e);

    if (edge) enter(edge);
  };

  return (
    <g onPointerDown={onPointerDown} onPointerOver={onPointerOver}>
      {edges.map((edge) => (
        <rect key={edge} data-maze-edge={edge} {...edgeHitRect(edge)} rx={BAND / 2} className="maze-edge-hit" />
      ))}
    </g>
  );
});

interface Props {
  map: Pick<BattleMapConfig, "cols" | "rows">;
  editing: MazeEditing;
}

export const MazeEdgeEditor = memo(function MazeEdgeEditor({ map, editing }: Props) {
  const { tool, stroke, picked } = editing;

  const { cols, rows } = map;

  const edges = useMemo(() => allInteriorEdges({ cols, rows }), [cols, rows]);

  const walls = tool === "walls";

  const { begin, enter, end, pending } = stroke;

  useEffect(() => {
    if (!walls) return;

    window.addEventListener("pointerup", end);

    return () => window.removeEventListener("pointerup", end);
  }, [walls, end]);

  return (
    <g data-maze-editor={tool}>
      {picked && <rect data-maze-picked="" className="maze-picked" x={picked.x * UNIT} y={picked.y * UNIT} width={UNIT} height={UNIT} vectorEffect="non-scaling-stroke" pointerEvents="none" />}
      {walls && <EdgeHits edges={edges} begin={begin} enter={enter} />}
      {walls && pending.size > 0 && (
        <g pointerEvents="none">
          {[...pending].map((edge) => (
            <rect key={edge} data-maze-pending={edge} {...edgeHitRect(edge)} rx={BAND / 2} className="maze-edge-pending" />
          ))}
        </g>
      )}
    </g>
  );
});
