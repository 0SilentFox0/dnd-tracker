"use client";

import { useCallback, useState } from "react";

import { DEFAULT_BATTLE_MAP, DEFAULT_HAZARD_DAMAGE_TYPE, DEFAULT_HAZARD_DICE, DEFAULT_HAZARD_LABEL, DEFAULT_MAP_BACKGROUND, emptyMaze } from "@/lib/constants/battle";
import { useImageSize } from "@/lib/hooks/common";
import {
  applyMargins,
  clampMargins,
  gridForCellSize,
  hasPlayableArea,
  hazardDamage,
  impliedCellPx,
  inferMargins,
  isPreviewSafeBackground,
  type Margins,
  paintCells,
  resizeMap,
  type SetupTool,
} from "@/lib/utils/battle/grid";
import type { BattleMapConfig, GridPoint } from "@/types/battle";

const NO_MARGINS: Margins = { top: 0, right: 0, bottom: 0, left: 0 };

/** Пензель небезпеки; порожні кубики — небезпека без шкоди */
export interface HazardBrush {
  label: string;
  dice: string;
  damageType: string;
}

const DEFAULT_BRUSH: HazardBrush = { label: DEFAULT_HAZARD_LABEL, dice: DEFAULT_HAZARD_DICE, damageType: DEFAULT_HAZARD_DAMAGE_TYPE };

export const NO_PLAYABLE_NOTICE = "Має лишитися хоча б одна вільна ділянка 2×2";

export function useBattleMapEditor(initial: BattleMapConfig | null | undefined) {
  const [enabled, setEnabledState] = useState(Boolean(initial));

  const [map, setMap] = useState<BattleMapConfig>(() => initial ?? { ...DEFAULT_BATTLE_MAP });

  const [margins, setMarginsState] = useState<Margins>(() => (initial ? inferMargins(initial) : NO_MARGINS));

  const [tool, setToolState] = useState<SetupTool | null>(null);

  const [brush, setBrushState] = useState<HazardBrush>(DEFAULT_BRUSH);

  const setBrush = useCallback((patch: Partial<HazardBrush>) => setBrushState((b) => ({ ...b, ...patch })), []);

  const [notice, setNotice] = useState<string | null>(null);

  const setEnabled = useCallback((value: boolean) => {
    setEnabledState(value);

    if (!value) setNotice(null);
  }, []);

  const setTool = useCallback((value: SetupTool | null) => {
    setToolState(value);
    setNotice(null);
  }, []);

  const image = useImageSize(enabled ? (isPreviewSafeBackground(map.background) ? map.background : DEFAULT_MAP_BACKGROUND) : null);

  const resize = useCallback(
    (cols: number, rows: number, backgroundCols: number | undefined) => {
      const nextMargins = clampMargins({ cols, rows }, margins);

      const { backgroundCols: _old, ...sized } = applyMargins(resizeMap(applyMargins(map, NO_MARGINS, margins), cols, rows), nextMargins, NO_MARGINS);

      const next = backgroundCols === undefined ? sized : { ...sized, backgroundCols };

      if (!hasPlayableArea(next)) return setNotice(NO_PLAYABLE_NOTICE);

      setNotice(null);
      setMap(next);
      setMarginsState(nextMargins);
    },
    [map, margins],
  );

  // ручний розмір скидає масштаб фону: він знову вписується в сітку, а повзунок показує нову клітинку
  const setSize = useCallback((cols: number, rows: number) => resize(cols, rows, undefined), [resize]);

  const setCellSize = useCallback(
    (cellPx: number) => {
      if (!image) return;

      const grid = gridForCellSize(image, cellPx);

      resize(grid.cols, grid.rows, grid.backgroundCols);
    },
    [image, resize],
  );

  const setGridOffset = useCallback((gridOffset: { x: number; y: number }) => setMap((m) => ({ ...m, gridOffset })), []);

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

  // масштаб і зсув належать старому фону
  const setBackground = useCallback((background: string | null) => setMap(({ backgroundCols: _cols, gridOffset: _offset, ...m }) => ({ ...m, background })), []);

  const setMaze = useCallback((on: boolean) => {
    setMap((m) => ({ ...m, maze: on ? emptyMaze() : null }));

    if (on) setToolState(null);
  }, []);

  const onStroke = useCallback(
    (cells: GridPoint[]) => {
      if (!tool || cells.length === 0) return;

      const hazard = tool === "hazard" ? { label: brush.label.trim() || DEFAULT_HAZARD_LABEL, damage: hazardDamage(brush.dice, brush.damageType) } : undefined;

      const next = paintCells(map, cells, tool, hazard);

      if (!hasPlayableArea(next)) return setNotice(NO_PLAYABLE_NOTICE);

      setNotice(null);
      setMap(next);
    },
    [tool, map, brush],
  );

  return {
    state: { enabled, map, maze: map.maze ?? null, margins, tool, notice, value: enabled ? map : null, cellPx: image ? impliedCellPx(map, image) : null },
    brush,
    actions: { setEnabled, setSize, setCellSize, setGridOffset, setOpacity, setMargins, setTool, setBackground, setBrush, setMaze, onStroke },
  };
}

export type BattleMapEditor = ReturnType<typeof useBattleMapEditor>;
