import { createSnow } from "./snow";
import { type Rand, type WeatherEffect, type WeatherSim, type WeatherSize, wrap } from "./types";

interface Firefly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  turnIn: number;
  phase: number;
  rate: number;
  r: number;
}

const WIND = 70;

const GUST = 90;

export const FIREFLY_RGB = "150,255,120";

export const BLACK_SNOW = "rgba(22,22,26,.85)";

/** Світлячок спалахує й гасне: половину циклу темний. */
export const fireflyGlow = (phase: number) => Math.min(1, Math.max(0, (Math.sin(phase) - 0.1) / 0.7));

export function createCrypt(size: WeatherSize, count: number, rand: Rand): WeatherSim {
  const span = Math.max(size.width, size.height);

  const turn = (f: Firefly) => {
    const angle = rand() * Math.PI * 2;

    const speed = 12 + rand() * 38;

    f.vx = Math.cos(angle) * speed;
    f.vy = Math.sin(angle) * speed;
    f.turnIn = 0.3 + rand() * 1.2;
  };

  const flies: Firefly[] = Array.from({ length: Math.max(6, Math.round(count / 4)) }, () => {
    const f: Firefly = { x: rand() * size.width, y: rand() * size.height, vx: 0, vy: 0, turnIn: 0, phase: rand() * Math.PI * 2, rate: 1.5 + rand() * 2, r: 1.2 + rand() * 1.2 };

    turn(f);

    return f;
  });

  const snow = createSnow(size, count, rand, { wind: WIND, gust: GUST, sway: 14, minSpeed: 30, maxSpeed: 70, color: BLACK_SNOW });

  let t = 0;

  return {
    step(dt) {
      t += dt;
      snow.step(dt);

      for (const f of flies) {
        f.turnIn -= dt;

        if (f.turnIn <= 0) turn(f);

        f.phase += f.rate * dt;
        f.x = wrap(f.x + f.vx * dt, size.width);
        f.y = wrap(f.y + f.vy * dt, size.height);
      }
    },
    draw(g) {
      snow.draw(g);
      g.globalCompositeOperation = "lighter";

      for (const f of flies) {
        const k = fireflyGlow(f.phase);

        if (k <= 0) continue;

        g.fillStyle = `rgba(${FIREFLY_RGB},${(0.22 * k).toFixed(3)})`;
        g.beginPath();
        g.arc(f.x, f.y, f.r * 4, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = `rgba(${FIREFLY_RGB},${(0.95 * k).toFixed(3)})`;
        g.beginPath();
        g.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        g.fill();
      }

      g.globalCompositeOperation = "source-over";

      const pulse = 0.8 + 0.2 * Math.sin(t * 0.8);

      const cx = size.width / 2;

      const cy = size.height / 2;

      const vignette = g.createRadialGradient(cx, cy, span * 0.3, cx, cy, span * 0.75);

      vignette.addColorStop(0, "rgba(0,12,10,0)");
      vignette.addColorStop(1, `rgba(0,12,10,${(0.45 * pulse).toFixed(3)})`);
      g.fillStyle = vignette;
      g.fillRect(0, 0, size.width, size.height);
    },
  };
}

export const crypt: WeatherEffect = {
  tint: "radial-gradient(ellipse at center, rgba(12,12,14,.15) 35%, rgba(0,0,0,.55))",
  opacity: 0.9,
  density: 260,
  cap: 260,
  create: createCrypt,
};
