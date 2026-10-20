import { createDrift } from "./drift";
import { fillFrame, type Rand, rgba, type WeatherEffect, type WeatherSim, type WeatherSize } from "./types";

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  r: number;
}

const HELL_TINT = "rgba(150,35,5,.2)";

export function createEmbers(size: WeatherSize, count: number, rand: Rand): WeatherSim {
  const spawn = (fresh: boolean): Spark => ({
    x: rand() * size.width,
    y: fresh ? rand() * size.height : size.height + rand() * 20,
    vx: (rand() - 0.5) * 40,
    vy: -(60 + rand() * 160),
    age: fresh ? rand() * 2 : 0,
    life: 2.5 + rand() * 3.5,
    r: 1 + rand() * 2.2,
  });

  const sparks = Array.from({ length: count }, () => spawn(true));

  const smoke = createDrift(size, Math.max(4, Math.round(count / 60)), rand, { vx: 8, vy: 0, color: "rgba(28,16,12,.5)", clear: "rgba(28,16,12,0)", minR: 0.2, maxR: 0.34, band: [-0.05, 0.22] });

  let t = 0;

  return {
    step(dt) {
      t += dt;
      smoke.step(dt);

      sparks.forEach((s, i) => {
        s.age += dt;
        s.x += (s.vx + Math.sin(s.age * 3) * 14) * dt;
        s.y += s.vy * dt;

        if (s.age >= s.life || s.y < -10) sparks[i] = spawn(false);
      });
    },
    draw(g) {
      fillFrame(g, size, HELL_TINT);

      const top = size.height * 0.3;

      const flicker = 0.85 + 0.15 * Math.sin(t * 7) * Math.sin(t * 2.3);

      const glow = g.createLinearGradient(0, size.height, 0, top);

      glow.addColorStop(0, rgba("255,85,10", 0.5 * flicker));
      glow.addColorStop(0.45, rgba("220,50,0", 0.28 * flicker));
      glow.addColorStop(1, "rgba(200,40,0,0)");
      g.fillStyle = glow;
      g.fillRect(0, top, size.width, size.height - top);
      smoke.draw(g);
      g.globalCompositeOperation = "lighter";

      for (const s of sparks) {
        const k = 1 - s.age / s.life;

        g.fillStyle = rgba(`255,${Math.round(110 + 110 * k)},40`, 0.95 * k);
        g.beginPath();
        g.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        g.fill();
      }

      g.globalCompositeOperation = "source-over";
    },
  };
}

export const embers: WeatherEffect = {
  tint: "linear-gradient(to top, rgba(255,85,10,.55), rgba(200,45,0,.25) 45%, rgba(130,30,5,.2) 75%, rgba(30,16,12,.45))",
  opacity: 0.9,
  density: 560,
  create: createEmbers,
};
