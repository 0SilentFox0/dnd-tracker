import { clamp01 } from "../../runtime/easing";
import { bottomPoint, edgeGlow, type FrameBox, verticalFill } from "../../runtime/frame-kit";
import { chance, type Debris, type FxPoint, pick, rand, stepBodies } from "../../runtime/geometry";
import { emit } from "../../runtime/primitives";
import { jaggedShape, polyline, polyPath } from "../../runtime/shapes";
import { show, tween } from "../../runtime/stage";
import type { FrameAnimation } from "./types";

interface Chunk extends Debris {
  rot: number;
  spin: number;
  shape: FxPoint[];
  color: string;
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
  return { x: b.x + rand(10, b.w - 10), y: b.y + b.h - 2, vx: rand(-60, 60), vy: rand(-260, -140), rot: rand(0, 6), spin: rand(-10, 10), shape: jaggedShape(5, rand(3.5, 7), 0.3, 0.6), color: pick(ROCK), rest: false };
}

export const earthFrame: FrameAnimation = async (s, box, { light }) => {
  let k = 0;

  let fade = 1;

  const lines = crack(box);

  const chunks = Array.from({ length: 12 }, () => chunk(box));

  const floor = box.y + box.h - 3;

  const fill = verticalFill(s.g, box, [[0, "rgba(120,85,45,0.5)"], [0.5, "rgba(120,85,45,0.12)"], [1, "rgba(120,85,45,0)"]]);

  const hide = show(s, (g) => {
    const crackGrow = clamp01(k / 0.25);

    const tone = clamp01(k / 0.08) * fade;

    g.save();

    edgeGlow(g, box, { fill, fillAlpha: tone, stroke: `rgba(215,170,105,${0.9 * tone})`, width: 2 });
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
      polyPath(g, c.shape);
      g.fillStyle = c.color;
      g.fill();
      g.strokeStyle = "rgba(220,185,130,0.85)";
      g.lineWidth = 1;
      g.stroke();
      g.restore();
    }

    g.restore();
  });

  const physics = (dt: number) => stepBodies(chunks, dt, GRAVITY, floor);

  for (let i = 0; i < 36; i++) emit(s, bottomPoint(box), { tints: DUST, speed: [15, 55], angle: [-Math.PI * 0.95, -Math.PI * 0.05], life: [0.7, 1.2], scale: [0.5, 1.1], drag: 2, additive: false, alpha: light ? 0.3 : 0.8 });

  await tween(s, QUAKE_MS, (v, dt) => {
    k = v;
    physics(dt);

    if (v < 0.5 && chance(0.35, dt)) emit(s, bottomPoint(box), { tints: DUST, speed: [8, 30], angle: [-Math.PI * 0.9, -Math.PI * 0.1], life: [0.6, 1], scale: [0.35, 0.8], drag: 2, additive: false, alpha: light ? 0.2 : 0.5 });
  });
  await tween(s, FADE_MS, (v, dt) => {
    fade = 1 - v;
    physics(dt);
  });
  hide();
};
