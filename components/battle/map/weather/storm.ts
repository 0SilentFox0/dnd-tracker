import { createRain } from "./rain";
import type { Rand, WeatherEffect, WeatherSim, WeatherSize } from "./types";

export const FLASH_SEC = 0.25;

export const nextFlashIn = (rand: Rand) => 6 + rand() * 9;

export function createStorm(size: WeatherSize, count: number, rand: Rand): WeatherSim {
  const rainSim = createRain(size, count, rand, { wind: 180, minSpeed: 1000, maxSpeed: 1500, color: "rgba(215,228,255,.9)", lineWidth: 2, haze: "rgba(8,12,32,.36)" });

  let untilFlash = nextFlashIn(rand);

  let flash = 0;

  return {
    step(dt) {
      rainSim.step(dt);
      flash = Math.max(0, flash - dt / FLASH_SEC);
      untilFlash -= dt;

      if (untilFlash <= 0) {
        flash = 1;
        untilFlash = nextFlashIn(rand);
      }
    },
    draw(g) {
      rainSim.draw(g);

      if (flash <= 0) return;

      g.fillStyle = `rgba(255,255,255,${(0.55 * flash).toFixed(3)})`;
      g.fillRect(0, 0, size.width, size.height);
    },
  };
}

export const storm: WeatherEffect = { tint: "rgba(12,18,42,.42)", opacity: 0.85, density: 700, cap: 700, create: createStorm };
