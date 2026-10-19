import { createDrift } from "./drift";
import type { Rand, WeatherEffect, WeatherSim, WeatherSize } from "./types";

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  r: number;
}

export function createEmbers(size: WeatherSize, count: number, rand: Rand): WeatherSim {
  const spawn = (fresh: boolean): Spark => ({
    x: rand() * size.width,
    y: fresh ? rand() * size.height : size.height + rand() * 20,
    vx: (rand() - 0.5) * 30,
    vy: -(40 + rand() * 90),
    age: fresh ? rand() * 2 : 0,
    life: 2 + rand() * 3,
    r: 0.8 + rand() * 1.6,
  });

  const sparks = Array.from({ length: count }, () => spawn(true));

  const smoke = createDrift(size, Math.max(3, Math.round(count / 25)), rand, { vx: 6, vy: -18, color: "rgba(60,55,50,.28)", clear: "rgba(60,55,50,0)", minR: 0.18, maxR: 0.3 });

  return {
    step(dt) {
      smoke.step(dt);

      sparks.forEach((s, i) => {
        s.age += dt;
        s.x += (s.vx + Math.sin(s.age * 3) * 12) * dt;
        s.y += s.vy * dt;

        if (s.age >= s.life || s.y < -10) sparks[i] = spawn(false);
      });
    },
    draw(g) {
      const top = size.height * 0.55;

      const glow = g.createLinearGradient(0, size.height, 0, top);

      glow.addColorStop(0, "rgba(255,90,20,.22)");
      glow.addColorStop(1, "rgba(255,90,20,0)");
      g.fillStyle = glow;
      g.fillRect(0, top, size.width, size.height - top);
      smoke.draw(g);
      g.globalCompositeOperation = "lighter";

      for (const s of sparks) {
        const k = 1 - s.age / s.life;

        g.fillStyle = `rgba(255,${Math.round(120 + 100 * k)},40,${(0.9 * k).toFixed(3)})`;
        g.beginPath();
        g.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        g.fill();
      }

      g.globalCompositeOperation = "source-over";
    },
  };
}

export const embers: WeatherEffect = {
  tint: "linear-gradient(to top, rgba(255,90,20,.25), rgba(255,90,20,0) 60%)",
  opacity: 0.9,
  density: 160,
  cap: 160,
  create: createEmbers,
};
