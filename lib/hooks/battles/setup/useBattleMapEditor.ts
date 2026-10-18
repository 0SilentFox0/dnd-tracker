"use client";

import { useCallback, useState } from "react";

import { DEFAULT_BATTLE_MAP } from "@/lib/constants/battle";
import { applyMargins, inBounds, inferMargins, type Margins, resizeMap, toggleBlocked } from "@/lib/utils/battle/grid";
import type { BattleMapConfig, GridPoint } from "@/types/battle";

const NO_MARGINS: Margins = { top: 0, right: 0, bottom: 0, left: 0 };

export function useBattleMapEditor(initial: BattleMapConfig | null | undefined) {
  const [enabled, setEnabled] = useState(Boolean(initial));

  const [map, setMap] = useState<BattleMapConfig>(() => initial ?? { ...DEFAULT_BATTLE_MAP });

  const [margins, setMarginsState] = useState<Margins>(() => (initial ? inferMargins(initial) : NO_MARGINS));

  const [paint, setPaint] = useState(false);

  const setSize = useCallback(
    (cols: number, rows: number) => setMap((m) => applyMargins(resizeMap(applyMargins(m, NO_MARGINS, margins), cols, rows), margins, NO_MARGINS)),
    [margins],
  );

  const setMargins = useCallback(
    (next: Margins) => {
      setMap((m) => applyMargins(m, next, margins));
      setMarginsState(next);
    },
    [margins],
  );

  const setOpacity = useCallback((opacity: number) => setMap((m) => ({ ...m, opacity })), []);

  const setBackground = useCallback((background: string | null) => setMap((m) => ({ ...m, background })), []);

  const onCellClick = useCallback(
    (p: GridPoint) => {
      if (paint && inBounds(map, p)) setMap((m) => toggleBlocked(m, p));
    },
    [paint, map],
  );

  return {
    enabled,
    setEnabled,
    map,
    setSize,
    setOpacity,
    margins,
    setMargins,
    paint,
    setPaint,
    onCellClick,
    setBackground,
    value: enabled ? map : null,
  };
}

export type BattleMapEditor = ReturnType<typeof useBattleMapEditor>;
