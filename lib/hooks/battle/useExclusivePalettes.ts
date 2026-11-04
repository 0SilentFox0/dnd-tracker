"use client";

import { useEffect, useRef } from "react";

import { type PaletteKey, palettesToClose } from "./modes/palettes";

type Closer = (() => void) | undefined;

/** Щойно відкрита палітра (режиму, місцевості, погоди, руху, фону) закриває решту. */
export function useExclusivePalettes(open: Record<PaletteKey, boolean>, closers: Record<PaletteKey, Closer>) {
  const { mode, terrain, weather, motion, background } = open;

  const { mode: closeMode, terrain: closeTerrain, weather: closeWeather, motion: closeMotion, background: closeBackground } = closers;

  const prev = useRef({ mode, terrain, weather, motion, background });

  useEffect(() => {
    const next = { mode, terrain, weather, motion, background };

    const byKey = { mode: closeMode, terrain: closeTerrain, weather: closeWeather, motion: closeMotion, background: closeBackground };

    for (const key of palettesToClose(prev.current, next)) byKey[key]?.();

    prev.current = next;
  }, [mode, terrain, weather, motion, background, closeMode, closeTerrain, closeWeather, closeMotion, closeBackground]);
}
