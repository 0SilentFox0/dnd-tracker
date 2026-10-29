"use client";

import { useEffect, useRef } from "react";

import { type PaletteKey, palettesToClose } from "./modes/palettes";

type Closer = (() => void) | undefined;

/** Щойно відкрита палітра (режиму, місцевості, погоди) закриває решту. */
export function useExclusivePalettes(open: Record<PaletteKey, boolean>, closers: Record<PaletteKey, Closer>) {
  const { mode, terrain, weather } = open;

  const { mode: closeMode, terrain: closeTerrain, weather: closeWeather } = closers;

  const prev = useRef({ mode, terrain, weather });

  useEffect(() => {
    const next = { mode, terrain, weather };

    const byKey = { mode: closeMode, terrain: closeTerrain, weather: closeWeather };

    for (const key of palettesToClose(prev.current, next)) byKey[key]?.();

    prev.current = next;
  }, [mode, terrain, weather, closeMode, closeTerrain, closeWeather]);
}
