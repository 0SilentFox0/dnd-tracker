"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cellKey } from "@/lib/utils/battle/grid";
import type { MapTerrainData } from "@/types/api";
import type { GridPoint, TerrainKind } from "@/types/battle";

export type TerrainBrush = TerrainKind | "erase";

export const DEFAULT_HAZARD_LABEL = "Небезпечна зона";

export interface MapTerrainTool {
  active: boolean;
  toggle(): void;
  close(): void;
  brush: TerrainBrush;
  setBrush(brush: TerrainBrush): void;
  rounds: number;
  setRounds(rounds: number): void;
  label: string;
  setLabel(label: string): void;
  commit(cells: GridPoint[]): void;
}

interface Options {
  isDM: boolean;
  mutate: (data: MapTerrainData) => void;
  onActivate?: () => void;
}

export function useMapTerrainTool({ isDM, mutate, onActivate }: Options): MapTerrainTool {
  const [on, setOn] = useState(false);

  const [brush, setBrush] = useState<TerrainBrush>("wall");

  const [rounds, setRounds] = useState(1);

  const [label, setLabel] = useState(DEFAULT_HAZARD_LABEL);

  const active = on && isDM;

  const latest = useRef({ brush, rounds, label, mutate });

  useEffect(() => {
    latest.current = { brush, rounds, label, mutate };
  });

  const close = useCallback(() => setOn(false), []);

  const toggle = useCallback(() => {
    setOn((v) => !v);
    onActivate?.();
  }, [onActivate]);

  const commit = useCallback((points: GridPoint[]) => {
    const cells = [...new Set(points.map(cellKey))];

    if (cells.length === 0) return;

    const { brush: b, rounds: r, label: l, mutate: run } = latest.current;

    const terrain: MapTerrainData["terrain"] =
      b === "erase"
        ? null
        : b === "barrier"
          ? { kind: b, rounds: Math.min(20, Math.max(1, Math.trunc(r) || 1)) }
          : b === "hazard"
            ? { kind: b, label: l.trim() || DEFAULT_HAZARD_LABEL }
            : { kind: b };

    run({ cells, terrain });
  }, []);

  useEffect(() => {
    if (!active) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOn(false);
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  return { active, toggle, close, brush, setBrush, rounds, setRounds, label, setLabel, commit };
}
