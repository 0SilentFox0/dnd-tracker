import { type Rand, type WeatherEffect, type WeatherSim, type WeatherSize, wrap } from "./types";

interface Drop {
  x: number;
  y: number;
  len: number;
  speed: number;
}

export interface RainOptions {
  wind: number;
  minSpeed: number;
  maxSpeed: number;
  color: string;
}

export function createRain(size: WeatherSize, count: number, rand: Rand, o: RainOptions): WeatherSim {
  const drops: Drop[] = Array.from({ length: count }, () => ({
    x: rand() * size.width,
    y: rand() * size.height,
    len: 10 + rand() * 12,
    speed: o.minSpeed + rand() * (o.maxSpeed - o.minSpeed),
  }));

  const slant = o.wind / o.maxSpeed;

  return {
    step(dt) {
      for (const d of drops) {
        d.y += d.speed * dt;
        d.x = wrap(d.x + o.wind * dt, size.width);

        if (d.y - d.len > size.height) {
          d.y = -d.len * rand();
          d.x = rand() * size.width;
        }
      }
    },
    draw(g) {
      g.strokeStyle = o.color;
      g.lineWidth = 1;
      g.beginPath();

      for (const d of drops) {
        g.moveTo(d.x, d.y);
        g.lineTo(d.x - slant * d.len, d.y - d.len);
      }

      g.stroke();
    },
  };
}

export const rain: WeatherEffect = {
  tint: "rgba(60,80,120,.22)",
  opacity: 0.75,
  density: 320,
  cap: 320,
  create: (size, count, rand) => createRain(size, count, rand, { wind: 60, minSpeed: 650, maxSpeed: 950, color: "rgba(190,210,255,.55)" }),
};
