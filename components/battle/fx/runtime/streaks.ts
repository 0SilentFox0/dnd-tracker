import { type FxPoint, pick, rand } from "./geometry";
import { show, type Stage, tween } from "./stage";

interface Streak {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  width: number;
  color: string;
}

interface StreakOptions {
  colors: string[];
  count: number;
  /** Centre of the cone and its half-width; a full circle when omitted. */
  angle?: number;
  cone?: number;
  speed: [number, number];
  life?: [number, number];
  width?: [number, number];
  gravity?: number;
  drag?: number;
  /** Tail length in seconds of travel: a faster spark draws a longer line. */
  tail?: number;
}

/** A spray of line sparks (oriented by their velocity) that runs until the longest one burns out. */
export function streakBurst(s: Stage, at: FxPoint, o: StreakOptions) {
  const life = o.life ?? [0.35, 0.8];

  const list: Streak[] = Array.from({ length: o.count }, () => {
    const a = o.angle === undefined ? rand(0, Math.PI * 2) : o.angle + rand(-(o.cone ?? Math.PI), o.cone ?? Math.PI);

    const v = rand(...o.speed);

    return { x: at.x, y: at.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(...life), width: rand(...(o.width ?? [1.2, 2.4])), color: pick(o.colors) };
  });

  const maxLife = Math.max(...list.map((p) => p.life));

  const tail = o.tail ?? 0.035;

  let age = 0;

  const hide = show(s, (g) => {
    g.globalCompositeOperation = "lighter";
    g.lineCap = "round";

    for (const p of list) {
      const k = age / p.life;

      if (k >= 1) continue;

      g.globalAlpha = 1 - k * k;
      g.strokeStyle = p.color;
      g.lineWidth = p.width * (1 - k * 0.6);
      g.beginPath();
      g.moveTo(p.x - p.vx * tail, p.y - p.vy * tail);
      g.lineTo(p.x, p.y);
      g.stroke();
    }
  });

  return tween(s, maxLife * 1000, (_, dt) => {
    age += dt;

    for (const p of list) {
      p.vx *= 1 - (o.drag ?? 2.5) * dt;
      p.vy = p.vy * (1 - (o.drag ?? 2.5) * dt) + (o.gravity ?? 200) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }).then(hide);
}
