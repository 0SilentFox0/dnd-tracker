"use client";

import { useEffect, useState } from "react";

import { WORLD_DIVE_MS, WORLD_REVEAL_MS } from "@/lib/constants/world";
import { diveOrigin } from "@/lib/utils/world/dive";
import type { MapPoint, WorldView } from "@/types/world";

type Scene = Pick<WorldView, "map" | "markers">;

export type DivePhase = "idle" | "dive" | "reveal";

interface DiveState<T> {
  shown: T | undefined;
  target: T | undefined;
  phase: DivePhase;
  origin: MapPoint | null;
}

function advance<T extends Scene>(s: DiveState<T>, view: T, reduced: boolean): DiveState<T> {
  if (s.phase === "dive") return { ...s, target: view };

  const phase = s.phase === "reveal" ? "reveal" : "idle";

  if (!s.shown || reduced || view.map.id === s.shown.map.id) return { shown: view, target: view, phase, origin: null };

  const origin = diveOrigin(s.shown, view);

  return origin ? { shown: s.shown, target: view, phase: "dive", origin } : { shown: view, target: view, phase: "reveal", origin: null };
}

export function useWorldDive<T extends Scene>(view: T | undefined, reduced: boolean): { phase: DivePhase; origin: MapPoint | null; shown: T | undefined } {
  const [state, setState] = useState<DiveState<T>>({ shown: view, target: view, phase: "idle", origin: null });

  const [seen, setSeen] = useState(view);

  if (view !== seen) {
    setSeen(view);

    if (view) setState(advance(state, view, reduced));
  }

  const { phase } = state;

  useEffect(() => {
    if (phase === "idle") return;

    const timer = setTimeout(
      () => setState((s) => (phase === "dive" ? { shown: s.target, target: s.target, phase: "reveal", origin: null } : { ...s, phase: "idle" })),
      phase === "dive" ? WORLD_DIVE_MS : WORLD_REVEAL_MS,
    );

    return () => clearTimeout(timer);
  }, [phase]);

  return { phase, origin: state.origin, shown: state.shown };
}
