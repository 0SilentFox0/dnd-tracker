import { type Rand, type WeatherEffect, type WeatherSim, type WeatherSize, wrap } from "./types";

interface Flake {
  x: number;
  y: number;
  r: number;
  speed: number;
  phase: number;
}

export interface SnowOptions {
  wind: number;
  sway: number;
  minSpeed: number;
  maxSpeed: number;
  color: string;
  haze?: string;
}

export function createSnow(size: WeatherSize, count: number, rand: Rand, o: SnowOptions): WeatherSim {
  const flakes: Flake[] = Array.from({ length: count }, () => ({
    x: rand() * size.width,
    y: rand() * size.height,
    r: 1 + rand() * 2.2,
    speed: o.minSpeed + rand() * (o.maxSpeed - o.minSpeed),
    phase: rand() * Math.PI * 2,
  }));

  return {
    step(dt) {
      for (const f of flakes) {
        f.phase += dt * 1.5;
        f.y += f.speed * dt;
        f.x = wrap(f.x + (o.wind + Math.sin(f.phase) * o.sway) * dt, size.width);

        if (f.y - f.r > size.height) {
          f.y = -f.r;
          f.x = rand() * size.width;
        }
      }
    },
    draw(g) {
      if (o.haze) {
        g.fillStyle = o.haze;
        g.fillRect(0, 0, size.width, size.height);
      }

      g.fillStyle = o.color;
      g.beginPath();

      for (const f of flakes) {
        g.moveTo(f.x + f.r, f.y);
        g.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      }

      g.fill();
    },
  };
}

export const snow: WeatherEffect = {
  tint: "rgba(200,215,240,.18)",
  opacity: 0.85,
  density: 220,
  cap: 220,
  create: (size, count, rand) => createSnow(size, count, rand, { wind: 12, sway: 18, minSpeed: 28, maxSpeed: 70, color: "rgba(255,255,255,.85)" }),
};

export const blizzard: WeatherEffect = {
  tint: "rgba(215,225,245,.3)",
  opacity: 0.85,
  density: 480,
  cap: 480,
  create: (size, count, rand) =>
    createSnow(size, count, rand, { wind: 260, sway: 40, minSpeed: 120, maxSpeed: 220, color: "rgba(255,255,255,.8)", haze: "rgba(220,230,250,.12)" }),
};
