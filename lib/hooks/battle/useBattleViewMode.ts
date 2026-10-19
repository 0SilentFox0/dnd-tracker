"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

export type BattleViewMode = "map" | "columns";

const key = (battleId: string) => `battle-view-mode:${battleId}`;

const listeners = new Set<() => void>();

const subscribe = (cb: () => void) => {
  listeners.add(cb);

  return () => void listeners.delete(cb);
};

function read(battleId: string): BattleViewMode {
  try {
    return window.localStorage.getItem(key(battleId)) === "columns" ? "columns" : "map";
  } catch {
    return "map";
  }
}

export function useBattleViewMode(battleId: string): [BattleViewMode, (mode: BattleViewMode) => void] {
  const stored = useSyncExternalStore(subscribe, () => read(battleId), () => "map" as const);

  const [fallback, setFallback] = useState<BattleViewMode | null>(null);

  const set = useCallback((next: BattleViewMode) => {
    setFallback(next);

    try {
      window.localStorage.setItem(key(battleId), next);
    } catch {
      // storage unavailable: the choice lasts until reload
    }

    listeners.forEach((cb) => cb());
  }, [battleId]);

  return [fallback ?? stored, set];
}
