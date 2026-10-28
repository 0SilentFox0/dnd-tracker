"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { closePolygon } from "@/lib/utils/world/geometry";
import type { MapPoint, Polygon } from "@/types/world";

export type WorldTool = "select" | "point" | "zone" | "entry" | "move";

interface Actions {
  onPoint(p: MapPoint): void;
  onZone(polygon: Polygon): void;
  onEntry(p: MapPoint): void;
  onMove?(p: MapPoint): void;
}

const POINT_DEBOUNCE_MS = 400;

const POINT_DEBOUNCE_DIST = 0.02;

// the Ukrainian letters sit on the same physical keys
export const TOOL_HOTKEYS: Record<string, WorldTool> = { v: "select", м: "select", p: "point", з: "point", z: "zone", я: "zone", e: "entry", у: "entry", m: "move", ь: "move" };

const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));

export function useMapDrawing(actions: Actions) {
  const [tool, setToolState] = useState<WorldTool>("select");

  const [draft, setDraft] = useState<MapPoint[]>([]);

  const setTool = useCallback((t: WorldTool) => {
    setToolState(t);
    setDraft([]);
  }, []);

  const lastPoint = useRef<{ p: MapPoint; at: number } | null>(null);

  const undoVertex = useCallback(() => setDraft((d) => d.slice(0, -1)), []);

  const cancel = useCallback(() => setDraft([]), []);

  const finish = useCallback(() => {
    const polygon = closePolygon(draft);

    if (!polygon) return;

    setDraft([]);
    actions.onZone(polygon);
  }, [draft, actions]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.target instanceof Element && e.target.closest("[role=dialog]")) return;

      const hotkey = TOOL_HOTKEYS[e.key.toLowerCase()];

      if (hotkey) setTool(hotkey);
      else if (e.key === "Escape" && tool === "zone" && draft.length) cancel();
      else if (e.key === "Escape" && tool !== "select") setTool("select");
      else if (e.key === "Backspace" && tool === "zone") undoVertex();
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [tool, draft.length, cancel, undoVertex, setTool]);

  const handlers = useMemo<{ onMapClick(p: MapPoint): void; onMapDoubleClick(p: MapPoint): void }>(
    () => ({
      onMapClick: (p) => {
        if (tool === "point") {
          const last = lastPoint.current;

          const now = Date.now();

          lastPoint.current = { p, at: now };

          // a double-click/tap fires two clicks: create only one marker
          if (last && now - last.at < POINT_DEBOUNCE_MS && Math.hypot(p.x - last.p.x, p.y - last.p.y) < POINT_DEBOUNCE_DIST) return;

          actions.onPoint(p);
        }
        else if (tool === "zone") setDraft((d) => [...d, p]);
        else if (tool === "entry") {
          setTool("select");
          actions.onEntry(p);
        } else if (tool === "move") actions.onMove?.(p);
      },
      onMapDoubleClick: () => {
        if (tool === "zone") finish();
      },
    }),
    [tool, actions, finish, setTool],
  );

  return { tool, setTool, draft, handlers, undoVertex, cancel, finish };
}
