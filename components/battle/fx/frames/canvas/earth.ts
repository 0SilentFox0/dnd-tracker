import { emit, show, tween } from "../../runtime/canvas";
import type { FxPoint } from "../../runtime/geometry";
import { rand } from "../../runtime/geometry";
import { clamp01, type FrameAnimation, type FrameBox, roundRect } from "./types";

interface Chunk {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  spin: number;
  shape: FxPoint[];
  color: string;
  rest: boolean;
}

const DUST = ["#b08a5a", "#c9a272", "#8a6a45"];

const ROCK = ["#4a3626", "#5a4330", "#3a2a1c"];

const QUAKE_MS = 1200;

const FADE_MS = 400;

const GRAVITY = 700;

function crack(b: FrameBox): FxPoint[][] {
  const x0 = b.x + b.w * rand(0.35, 0.65);

  const main: FxPoint[] = [{ x: x0, y: b.y + b.h }];

  const rise = b.h * rand(0.55, 0.8);

  for (let i = 1; i <= 6; i++) main.push({ x: x0 + rand(-9, 9) + i * rand(-2, 2), y: b.y + b.h - (rise * i) / 6 });

  const branches = [2, 4].map((at) => {
    const from = main[at];

    const dir = Math.random() < 0.5 ? -1 : 1;

    return [from, { x: from.x + dir * rand(8, 16), y: from.y - rand(3, 8) }, { x: from.x + dir * rand(18, 30), y: from.y - rand(4, 14) }];
  });

  return [main, ...branches];
}

function chunk(b: FrameBox): Chunk {
  const r = rand(3.5, 7);

  const shape = Array.from({ length: 5 }, (_, i) => {
    const a = (i / 5) * Math.PI * 2 + rand(-0.3, 0.3);

    const d = r * rand(0.6, 1);

    return { x: Math.cos(a) * d, y: Math.sin(a) * d };
  });

  return { x: b.x + rand(10, b.w - 10), y: b.y + b.h - 2, vx: rand(-60, 60), vy: rand(-260, -140), rot: rand(0, 6), spin: rand(-10, 10), shape, color: ROCK[Math.floor(Math.random() * ROCK.length)], rest: false };
}

function polyline(g: CanvasRenderingContext2D, pts: FxPoint[], upTo: number) {
  const n = Math.max(1, Math.floor(upTo * (pts.length - 1)));

  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);

  for (let i = 1; i <= n; i++) g.lineTo(pts[i].x, pts[i].y);

  g.stroke();
}

export const earthFrame: FrameAnimation = async (s, box) => {
  let k = 0;

  let fade = 1;

  const lines = crack(box);

  const chunks = Array.from({ length: 12 }, () => chunk(box));

  const floor = box.y + box.h - 3;

  let last = 0;

  const hide = show(s, (g) => {
    const crackGrow = clamp01(k / 0.25);

    const tone = clamp01(k / 0.08) * fade;

    g.save();

    const dust = g.createLinearGradient(0, box.y + box.h, 0, box.y);

    dust.addColorStop(0, `rgba(120,85,45,${0.5 * tone})`);
    dust.addColorStop(0.5, `rgba(120,85,45,${0.12 * tone})`);
    dust.addColorStop(1, "rgba(120,85,45,0)");
    roundRect(g, box);
    g.fillStyle = dust;
    g.fill();
    g.strokeStyle = `rgba(215,170,105,${0.9 * tone})`;
    g.lineWidth = 2;
    roundRect(g, box);
    g.stroke();
    g.lineCap = "round";
    g.lineJoin = "round";
    g.globalAlpha = fade;

    lines.forEach((pts, i) => {
      const grow = i === 0 ? crackGrow : clamp01((k - 0.12) / 0.2);

      if (!grow) return;

      g.strokeStyle = "rgba(225,190,135,0.55)";
      g.lineWidth = i === 0 ? 4 : 2.5;
      polyline(g, pts, grow);
      g.strokeStyle = "#1a110a";
      g.lineWidth = i === 0 ? 2.2 : 1.3;
      polyline(g, pts, grow);
    });

    for (const c of chunks) {
      g.save();
      g.translate(c.x, c.y);
      g.rotate(c.rot);
      g.beginPath();

      for (const p of c.shape) g.lineTo(p.x, p.y);

      g.closePath();
      g.fillStyle = c.color;
      g.fill();
      g.strokeStyle = "rgba(220,185,130,0.85)";
      g.lineWidth = 1;
      g.stroke();
      g.restore();
    }

    g.restore();
  });

  const physics = (now: number) => {
    const dt = (now - last) / 1000;

    last = now;

    for (const c of chunks) {
      if (c.rest) continue;

      c.vy += GRAVITY * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.rot += c.spin * dt;

      if (c.y < floor || c.vy < 0) continue;

      c.y = floor;

      if (Math.abs(c.vy) < 80) c.rest = true;
      else {
        c.vy *= -0.35;
        c.vx *= 0.5;
        c.spin *= 0.5;
      }
    }
  };

  for (let i = 0; i < 36; i++) emit(s, { x: box.x + rand(0, box.w), y: box.y + box.h }, { tints: DUST, speed: [15, 55], angle: [-Math.PI * 0.95, -Math.PI * 0.05], life: [0.7, 1.2], scale: [0.5, 1.1], drag: 2, additive: false, alpha: 0.8 });

  await tween(s, QUAKE_MS, (v) => {
    k = v;
    physics(v * QUAKE_MS);

    if (v < 0.5 && Math.random() < 0.35) emit(s, { x: box.x + rand(0, box.w), y: box.y + box.h }, { tints: DUST, speed: [8, 30], angle: [-Math.PI * 0.9, -Math.PI * 0.1], life: [0.6, 1], scale: [0.35, 0.8], drag: 2, additive: false, alpha: 0.5 });
  });
  last = 0;
  await tween(s, FADE_MS, (v) => {
    fade = 1 - v;
    physics(v * FADE_MS);
  });
  hide();
};
