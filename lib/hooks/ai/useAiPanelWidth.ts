"use client";

import { useCallback, useEffect, useState } from "react";

import { createStorageNumber, useStorageValue } from "@/lib/hooks/common";

export const AI_PANEL_WIDTH = { default: 420, min: 320, max: 960, step: 32, bookMin: 480 } as const;

const store = createStorageNumber("ai-panel-width", AI_PANEL_WIDTH.default);

const maxFor = (viewport: number) => Math.max(AI_PANEL_WIDTH.min, Math.min(AI_PANEL_WIDTH.max, viewport - AI_PANEL_WIDTH.bookMin));

export const clampAiPanelWidth = (width: number, viewport: number) => Math.round(Math.min(maxFor(viewport), Math.max(AI_PANEL_WIDTH.min, width)));

export function useAiPanelWidth() {
  const stored = useStorageValue(store, AI_PANEL_WIDTH.default);

  const [viewport, setViewport] = useState(AI_PANEL_WIDTH.max + AI_PANEL_WIDTH.bookMin);

  useEffect(() => {
    const sync = () => setViewport(window.innerWidth);

    sync();
    window.addEventListener("resize", sync);

    return () => window.removeEventListener("resize", sync);
  }, []);

  const setWidth = useCallback((next: number) => store.set(clampAiPanelWidth(next, window.innerWidth)), []);

  const reset = useCallback(() => store.set(AI_PANEL_WIDTH.default), []);

  return { width: clampAiPanelWidth(stored, viewport), max: maxFor(viewport), setWidth, reset };
}
