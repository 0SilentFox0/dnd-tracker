"use client";

import { useCallback, useState } from "react";

import type { MapPoint, WorldMarker } from "@/types/world";

export function useMoveTarget(markers: WorldMarker[]) {
  const [target, setTarget] = useState<{ point: MapPoint; markerId: string | null } | null>(null);

  const pickPoint = useCallback((point: MapPoint) => setTarget({ point, markerId: null }), []);

  const pickMarker = useCallback(
    (id: string) => {
      const m = markers.find((x) => x.id === id);

      if (m) setTarget({ point: { x: m.x, y: m.y }, markerId: id });
    },
    [markers],
  );

  const reset = useCallback(() => setTarget(null), []);

  return { point: target?.point ?? null, marker: markers.find((m) => m.id === target?.markerId) ?? null, pickPoint, pickMarker, reset };
}
