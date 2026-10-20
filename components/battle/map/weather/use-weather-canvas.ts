"use client";

import { useEffect } from "react";

import { WEATHER_EFFECTS } from "./index";
import { particleCount, type WeatherSim, type WeatherSize } from "./types";

import { fitCanvas } from "@/components/battle/fx/runtime/canvas-size";
import { subscribe } from "@/components/battle/fx/runtime/ticker";
import type { WeatherKind } from "@/types/battle";

// частинки дрібні: понад 1.5× пікселів не видно, а заливка дорожчає квадратично
const MAX_WEATHER_DPR = 1.5;

export function useWeatherCanvas(canvas: HTMLCanvasElement | null, opts: { weather: WeatherKind | null; running: boolean; scale: number }) {
  const { weather, running, scale } = opts;

  useEffect(() => {
    if (!canvas || !weather || !running) return;

    const g = canvas.getContext("2d");

    if (!g) return;

    const effect = WEATHER_EFFECTS[weather];

    let sim: WeatherSim | null = null;

    let size: WeatherSize = { width: 0, height: 0 };

    const rebuild = (box: WeatherSize) => {
      size = { width: box.width, height: box.height };

      if (!size.width || !size.height) {
        sim = null;

        return;
      }

      const dpr = fitCanvas(canvas, size.width, size.height, Math.min(window.devicePixelRatio || 1, MAX_WEATHER_DPR));

      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      sim = effect.create(size, particleCount(size, effect, scale), Math.random);
    };

    const observer = new ResizeObserver(([entry]) => rebuild(entry.contentRect));

    observer.observe(canvas);

    const unsubscribe = subscribe(
      (_now, dt) => {
        if (!sim) return;

        sim.step(Math.min(dt, 0.1));
        g.clearRect(0, 0, size.width, size.height);
        sim.draw(g);
      },
      { fps: 30 },
    );

    return () => {
      unsubscribe();
      observer.disconnect();
      g.clearRect(0, 0, size.width, size.height);
    };
  }, [canvas, weather, running, scale]);
}
