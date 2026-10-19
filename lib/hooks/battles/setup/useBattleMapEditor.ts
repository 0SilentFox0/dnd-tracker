"use client";

import { useCallback, useState } from "react";

import { DEFAULT_BATTLE_MAP } from "@/lib/constants/battle";
import { applyMargins, clampMargins, hasPlayableArea, inferMargins, type Margins, paintCells, resizeMap, type SetupTool } from "@/lib/utils/battle/grid";
import type { BattleMapConfig, GridPoint } from "@/types/battle";

const NO_MARGINS: Margins = { top: 0, right: 0, bottom: 0, left: 0 };

export const DEFAULT_HAZARD_LABEL = "Небезпечна зона";

export const NO_PLAYABLE_NOTICE = "Має лишитися хоча б одна вільна ділянка 2×2";

export function useBattleMapEditor(initial: BattleMapConfig | null | undefined) {
  const [enabled, setEnabledState] = useState(Boolean(initial));

  const [map, setMap] = useState<BattleMapConfig>(() => initial ?? { ...DEFAULT_BATTLE_MAP });

  const [margins, setMarginsState] = useState<Margins>(() => (initial ? inferMargins(initial) : NO_MARGINS));

  const [tool, setToolState] = useState<SetupTool | null>(null);

  const [hazardLabel, setHazardLabel] = useState(DEFAULT_HAZARD_LABEL);

  const [notice, setNotice] = useState<string | null>(null);

  const setEnabled = useCallback((value: boolean) => {
    setEnabledState(value);

    if (!value) setNotice(null);
  }, []);

  const setTool = useCallback((value: SetupTool | null) => {
    setToolState(value);
    setNotice(null);
  }, []);

  const setSize = useCallback(
    (cols: number, rows: number) => {
      const nextMargins = clampMargins({ cols, rows }, margins);

      const next = applyMargins(resizeMap(applyMargins(map, NO_MARGINS, margins), cols, rows), nextMargins, NO_MARGINS);

      if (!hasPlayableArea(next)) return setNotice(NO_PLAYABLE_NOTICE);

      setNotice(null);
      setMap(next);
      setMarginsState(nextMargins);
    },
    [map, margins],
  );

  const setMargins = useCallback(
    (next: Margins) => {
      const nextMap = applyMargins(map, next, margins);

      if (!hasPlayableArea(nextMap)) return setNotice(NO_PLAYABLE_NOTICE);

      setNotice(null);
      setMap(nextMap);
      setMarginsState(next);
    },
    [map, margins],
  );

  const setOpacity = useCallback((opacity: number) => setMap((m) => ({ ...m, opacity })), []);

  const setBackground = useCallback((background: string | null) => setMap((m) => ({ ...m, background })), []);

  const onStroke = useCallback(
    (cells: GridPoint[]) => {
      if (!tool || cells.length === 0) return;

      const next = paintCells(map, cells, tool, tool === "hazard" ? hazardLabel.trim() || DEFAULT_HAZARD_LABEL : undefined);

      if (!hasPlayableArea(next)) return setNotice(NO_PLAYABLE_NOTICE);

      setNotice(null);
      setMap(next);
    },
    [tool, map, hazardLabel],
  );

  return {
    enabled,
    setEnabled,
    map,
    setSize,
    setOpacity,
    margins,
    setMargins,
    tool,
    setTool,
    hazardLabel,
    setHazardLabel,
    onStroke,
    notice,
    setBackground,
    value: enabled ? map : null,
  };
}

export type BattleMapEditor = ReturnType<typeof useBattleMapEditor>;
