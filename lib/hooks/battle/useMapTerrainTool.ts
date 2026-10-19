"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { DEFAULT_HAZARD_DAMAGE_TYPE, DEFAULT_HAZARD_DICE, DEFAULT_HAZARD_LABEL } from "@/lib/constants/battle";
import { cellKey, hazardDamage } from "@/lib/utils/battle/grid";
import type { MapTerrainData, MapTerrainResponse } from "@/types/api";
import type { GridPoint, TerrainKind } from "@/types/battle";

export type TerrainBrush = TerrainKind | "erase";

export const MAX_STROKE_CELLS = 400;

export const MAX_BARRIER_ROUNDS = 20;

export interface TerrainBrushSettings {
  kind: TerrainBrush;
  rounds: number;
  label: string;
  /** порожньо — небезпека без шкоди */
  dice: string;
  damageType: string;
}

export interface MapTerrainTool {
  active: boolean;
  toggle(): void;
  close(): void;
  brush: TerrainBrushSettings;
  setBrush(patch: Partial<TerrainBrushSettings>): void;
  commit(cells: GridPoint[]): void;
  /** клітинки штрихів, що чекають на відповідь сервера */
  pending: ReadonlySet<string>;
}

interface Options {
  isDM: boolean;
  mutate: (data: MapTerrainData) => Promise<MapTerrainResponse | undefined>;
  onSkipped?: (count: number) => void;
  onActivate?: () => void;
}

const EMPTY: ReadonlySet<string> = new Set();

const DEFAULT_BRUSH: TerrainBrushSettings = { kind: "wall", rounds: 1, label: DEFAULT_HAZARD_LABEL, dice: DEFAULT_HAZARD_DICE, damageType: DEFAULT_HAZARD_DAMAGE_TYPE };

const sameTerrain = (a: MapTerrainData["terrain"], b: MapTerrainData["terrain"]) => JSON.stringify(a) === JSON.stringify(b);

function enqueue(queue: MapTerrainData[], next: MapTerrainData) {
  const last = queue.at(-1);

  if (last && sameTerrain(last.terrain, next.terrain)) {
    const merged = [...new Set([...last.cells, ...next.cells])];

    if (merged.length <= MAX_STROKE_CELLS) {
      last.cells = merged;

      return;
    }
  }

  for (let i = 0; i < next.cells.length; i += MAX_STROKE_CELLS) queue.push({ ...next, cells: next.cells.slice(i, i + MAX_STROKE_CELLS) });
}

export function useMapTerrainTool({ isDM, mutate, onSkipped, onActivate }: Options): MapTerrainTool {
  const [on, setOn] = useState(false);

  const [brush, setBrushState] = useState(DEFAULT_BRUSH);

  const setBrush = useCallback((patch: Partial<TerrainBrushSettings>) => setBrushState((b) => ({ ...b, ...patch })), []);

  const [pending, setPending] = useState<ReadonlySet<string>>(EMPTY);

  const active = on && isDM;

  const latest = useRef({ brush, mutate, onSkipped });

  useEffect(() => {
    latest.current = { brush, mutate, onSkipped };
  });

  const queue = useRef<MapTerrainData[]>([]);

  const inFlight = useRef<MapTerrainData | null>(null);

  const syncPending = useCallback(() => {
    const all = [inFlight.current, ...queue.current].flatMap((d) => d?.cells ?? []);

    setPending(all.length > 0 ? new Set(all) : EMPTY);
  }, []);

  // один запит за раз: паралельні штрихи читали б ту саму версію бою й ловили 409
  const drain = useCallback(async () => {
    if (inFlight.current) return;

    for (let next = queue.current.shift(); next; next = queue.current.shift()) {
      inFlight.current = next;
      syncPending();

      try {
        const res = await latest.current.mutate(next);

        if (res?.skipped?.length) latest.current.onSkipped?.(res.skipped.length);
      } catch {
        // помилку вже показав useBattleAction
      }
    }

    inFlight.current = null;
    syncPending();
  }, [syncPending]);

  const close = useCallback(() => setOn(false), []);

  const toggle = useCallback(() => {
    setOn((v) => !v);
    onActivate?.();
  }, [onActivate]);

  const commit = useCallback(
    (points: GridPoint[]) => {
      const cells = [...new Set(points.map(cellKey))];

      if (cells.length === 0) return;

      const { kind: b, rounds: r, label: l, dice: d, damageType: t } = latest.current.brush;

      const damage = hazardDamage(d, t);

      const terrain: MapTerrainData["terrain"] =
        b === "erase"
          ? null
          : b === "barrier"
            ? { kind: b, rounds: Math.min(MAX_BARRIER_ROUNDS, Math.max(1, Math.trunc(r) || 1)) }
            : b === "hazard"
              ? { kind: b, label: l.trim() || DEFAULT_HAZARD_LABEL, ...(damage && { damage }) }
              : { kind: b };

      enqueue(queue.current, { cells, terrain });
      syncPending();
      void drain();
    },
    [drain, syncPending],
  );

  useEffect(() => {
    if (!active) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOn(false);
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  return { active, toggle, close, brush, setBrush, commit, pending };
}
