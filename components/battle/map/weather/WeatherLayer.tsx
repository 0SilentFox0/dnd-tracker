"use client";

import { memo, useState } from "react";

import { WEATHER_EFFECTS } from "./index";
import { useWeatherCanvas } from "./use-weather-canvas";

import { usePageHidden, useReducedMotion } from "@/lib/hooks/common";
import type { WeatherKind } from "@/types/battle";

/** Поза шаром зуму й повороту: частинки летять в екранних координатах і на повернутій телефонній карті. */
export const WeatherLayer = memo(function WeatherLayer({ weather, phone }: { weather: WeatherKind | null | undefined; phone: boolean }) {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);

  const reduced = useReducedMotion();

  const hidden = usePageHidden();

  useWeatherCanvas(canvas, { weather: weather ?? null, running: !reduced && !hidden, scale: phone ? 0.5 : 1 });

  if (!weather) return null;

  const effect = WEATHER_EFFECTS[weather];

  return (
    <div data-weather={weather} aria-hidden className="pointer-events-none absolute inset-0 z-10" style={{ opacity: effect.opacity }}>
      {reduced ? (
        <div data-weather-tint className="absolute inset-0" style={{ background: effect.tint }} />
      ) : (
        <canvas ref={setCanvas} className="absolute inset-0 h-full w-full" />
      )}
    </div>
  );
});
