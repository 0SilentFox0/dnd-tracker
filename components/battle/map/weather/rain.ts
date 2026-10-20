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
  lineWidth: number;
  /** затемнення під краплями: без нього тонкі струмені губляться на світлому фоні */
  haze: string;
}

export function createRain(size: WeatherSize, count: number, rand: Rand, o: RainOptions): WeatherSim {
  const drops: Drop[] = Array.from({ length: count }, () => ({
    x: rand() * size.width,
    y: rand() * size.height,
    len: 14 + rand() * 18,
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
      g.fillStyle = o.haze;
      g.fillRect(0, 0, size.width, size.height);
      g.strokeStyle = o.color;
      g.lineWidth = o.lineWidth;
      g.lineCap = "round";
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
  tint: "rgba(45,65,105,.3)",
  opacity: 0.85,
  density: 520,
  cap: 520,
  create: (size, count, rand) =>
    createRain(size, count, rand, { wind: 80, minSpeed: 700, maxSpeed: 1000, color: "rgba(205,222,255,.85)", lineWidth: 1.6, haze: "rgba(30,45,80,.14)" }),
};
