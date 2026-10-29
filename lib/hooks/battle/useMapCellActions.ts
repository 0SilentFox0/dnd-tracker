"use client";

import { type Dispatch, type SetStateAction, useEffect, useMemo, useRef } from "react";

import { cellKey, type MapClick, type MapScene, sameCell } from "@/lib/utils/battle/grid";
import type { BattleMapActions, GridPoint } from "@/types/battle";

interface MapCellActionsInput {
  scene: MapScene | null;
  handle(click: MapClick): void;
  anyPending: boolean;
  setHoverCell: Dispatch<SetStateAction<GridPoint | null>>;
  tools: { modeToolActive: boolean; modeClick?: (p: GridPoint) => void; stroke(cells: GridPoint[]): void; returnToStart(): void };
}

/** Стабільні обробники карти: читають останній стан через ref, тож не ламають memo токенів. */
export function useMapCellActions({ scene, handle, anyPending, setHoverCell, tools }: MapCellActionsInput): BattleMapActions {
  const { modeToolActive, modeClick, stroke, returnToStart } = tools;

  const latest = useRef({ scene, handle, anyPending, stroke, returnToStart, modeToolActive, modeClick });

  useEffect(() => {
    latest.current = { scene, handle, anyPending, stroke, returnToStart, modeToolActive, modeClick };
  });

  return useMemo<BattleMapActions>(
    () => ({
      onCellClick: (p) => {
        const l = latest.current;

        if (l.anyPending) return;

        if (l.modeToolActive) l.modeClick?.(p);
        else if (l.scene) l.handle(l.scene.cellClick(p));
      },
      onCellHover: (p) =>
        setHoverCell((prev) => {
          const l = latest.current.scene;

          const next = p && (l?.aiming || l?.view.marks?.get(cellKey(p)) === "target") ? p : null;

          return sameCell(prev, next) ? prev : next;
        }),
      onStroke: (cells) => latest.current.stroke(cells),
      onReturn: () => latest.current.returnToStart(),
      onTokenClick: (id) => {
        const l = latest.current;

        if (l.scene) l.handle(l.scene.tokenClick(id));
      },
    }),
    [setHoverCell],
  );
}
