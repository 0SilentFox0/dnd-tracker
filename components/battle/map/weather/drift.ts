import type { Rand, WeatherSim, WeatherSize } from "./types";

interface Puff {
  x: number;
  y: number;
  r: number;
}

export interface DriftOptions {
  vx: number;
  vy: number;
  color: string;
  clear: string;
  /** радіус — частка більшої сторони рамки */
  minR: number;
  maxR: number;
  /** смуга висоти [від, до] у частках рамки; без неї — уся рамка */
  band?: [number, number];
}

export function createDrift(size: WeatherSize, count: number, rand: Rand, o: DriftOptions): WeatherSim {
  const span = Math.max(size.width, size.height);

  const [from, to] = o.band ?? [0, 1];

  const puffs: Puff[] = Array.from({ length: count }, () => ({
    x: rand() * size.width,
    y: (from + rand() * (to - from)) * size.height,
    r: span * (o.minR + rand() * (o.maxR - o.minR)),
  }));

  return {
    step(dt) {
      for (const p of puffs) {
        p.x += o.vx * dt;
        p.y += o.vy * dt;

        if (p.x - p.r > size.width) p.x = -p.r;

        if (p.x + p.r < 0) p.x = size.width + p.r;

        if (p.y + p.r < 0) p.y = size.height + p.r;

        if (p.y - p.r > size.height) p.y = -p.r;
      }
    },
    draw(g) {
      for (const p of puffs) {
        const grad = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);

        grad.addColorStop(0, o.color);
        grad.addColorStop(1, o.clear);
        g.fillStyle = grad;
        g.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
      }
    },
  };
}
