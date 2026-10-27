"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { closePolygon } from "@/lib/utils/world/geometry";
import type { MapPoint, Polygon } from "@/types/world";

export type WorldTool = "select" | "point" | "zone" | "entry";

interface Actions {
  onPoint(p: MapPoint): void;
  onZone(polygon: Polygon): void;
  onEntry(p: MapPoint): void;
}

const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));

export function useMapDrawing(actions: Actions) {
  const [tool, setToolState] = useState<WorldTool>("select");

  const [draft, setDraft] = useState<MapPoint[]>([]);

  const setTool = useCallback((t: WorldTool) => {
    setToolState(t);
    setDraft([]);
  }, []);

  const undoVertex = useCallback(() => setDraft((d) => d.slice(0, -1)), []);

  const cancel = useCallback(() => setDraft([]), []);

  const finish = useCallback(() => {
    const polygon = closePolygon(draft);

    if (!polygon) return;

    setDraft([]);
    actions.onZone(polygon);
  }, [draft, actions]);

  useEffect(() => {
    if (tool !== "zone") return;

    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;

      if (e.key === "Escape") cancel();
      else if (e.key === "Backspace") undoVertex();
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [tool, cancel, undoVertex]);

  const handlers = useMemo<{ onMapClick(p: MapPoint): void; onMapDoubleClick(p: MapPoint): void }>(
    () => ({
      onMapClick: (p) => {
        if (tool === "point") actions.onPoint(p);
        else if (tool === "zone") setDraft((d) => [...d, p]);
        else if (tool === "entry") {
          setTool("select");
          actions.onEntry(p);
        }
      },
      onMapDoubleClick: () => {
        if (tool === "zone") finish();
      },
    }),
    [tool, actions, finish, setTool],
  );

  return { tool, setTool, draft, handlers, undoVertex, cancel, finish };
}
