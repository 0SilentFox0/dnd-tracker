"use client";

import { useEffect, useRef } from "react";

import { type PaletteKey, palettesToClose } from "./modes/palettes";

type Closer = (() => void) | undefined;

/** Щойно відкрита палітра (режиму, місцевості, погоди, руху) закриває решту. */
export function useExclusivePalettes(open: Record<PaletteKey, boolean>, closers: Record<PaletteKey, Closer>) {
  const { mode, terrain, weather, motion } = open;

  const { mode: closeMode, terrain: closeTerrain, weather: closeWeather, motion: closeMotion } = closers;

  const prev = useRef({ mode, terrain, weather, motion });

  useEffect(() => {
    const next = { mode, terrain, weather, motion };

    const byKey = { mode: closeMode, terrain: closeTerrain, weather: closeWeather, motion: closeMotion };

    for (const key of palettesToClose(prev.current, next)) byKey[key]?.();

    prev.current = next;
  }, [mode, terrain, weather, motion, closeMode, closeTerrain, closeWeather, closeMotion]);
}
