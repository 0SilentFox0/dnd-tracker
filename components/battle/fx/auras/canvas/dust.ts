import { fadeInOut } from "../../runtime/easing";
import { pick, rand } from "../../runtime/geometry";
import type { AuraParticle } from "../../runtime/particles";
import { glow, spritePx } from "../../runtime/texture";
import { outside } from "./kit";
import type { AuraAnimation } from "./types";

const DUST = ["#b08a58", "#9a7444", "#c8a46e"];

// [x × r, bounce height × r, period s, phase, size]
const PEBBLES: [number, number, number, number, number][] = [[-0.85, 0.35, 0.9, 0, 2.6], [-0.35, 0.5, 1.1, 1.7, 2], [0.2, 0.3, 0.8, 0.6, 2.4], [0.7, 0.45, 1, 2.4, 2.8], [1.05, 0.25, 0.75, 1.1, 1.8]];

// Polylines of the ground cracks under the portrait, in r units from (cx, cy + 1.08r).
const CRACKS = [
  [[0, 0], [-0.25, 0.05], [-0.45, 0.02], [-0.7, 0.08], [-0.95, 0.05], [-1.2, 0.1]],
  [[0, 0], [0.22, -0.03], [0.48, 0.04], [0.72, 0.01], [1.0, 0.07], [1.25, 0.04]],
  [[-0.45, 0.02], [-0.55, 0.16]],
  [[0.48, 0.04], [0.6, 0.17]],
];

// The puff orbits (ox, oy) on a low, flat ellipse; cx/cy/r is the portrait disc it passes behind.
interface Swirl {
  ox: number;
  oy: number;
  rad: number;
  speed: number;
  cx: number;
  cy: number;
  r: number;
}

function drawDust(g: CanvasRenderingContext2D, p: AuraParticle<Swirl>, k: number) {
  const paint = () => spritePx(g, glow(p.tint), p.x, p.y, p.size0 * (1 + k * 0.5), p.size0 * 0.6, p.alpha * fadeInOut(k, 0.3), false);

  // Puffs on the far side of the swirl pass behind the portrait.
  if (Math.sin(p.phase) >= 0) paint();
  else outside(g, p.data, paint, 3);
}

function swirl(p: AuraParticle<Swirl>, dt: number) {
  const { ox, oy, rad, speed } = p.data;

  p.phase += speed * dt;
  p.x = ox + Math.cos(p.phase) * rad;
  p.y = oy + Math.sin(p.phase) * rad * 0.28 - p.age * 4;
}

function pebblePath(g: CanvasRenderingContext2D, x: number, y: number, size: number) {
  g.beginPath();
  g.moveTo(x - size, y);
  g.lineTo(x - size * 0.4, y - size * 0.9);
  g.lineTo(x + size * 0.7, y - size * 0.7);
  g.lineTo(x + size, y + size * 0.2);
  g.lineTo(x + size * 0.2, y + size * 0.8);
  g.closePath();
}

export const dustAura: AuraAnimation = {
  frame(g, ctx, t, dt) {
    const { cx, cy, r, s, parts } = ctx;

    const ground = cy + r * 1.08;

    g.globalCompositeOperation = "source-over";
    spritePx(g, glow("#7a5a32"), cx, ground, r * 3.2, r * 0.8, 0.8, false);

    g.lineCap = "round";
    g.lineJoin = "round";

    for (const [i, line] of CRACKS.entries()) {
      g.beginPath();

      for (const [x, y] of line) g.lineTo(cx + x * r, ground + y * r);

      g.lineWidth = (i < 2 ? 3 : 1.8) * s;
      g.strokeStyle = "rgba(225,190,135,0.55)";
      g.stroke();
      g.lineWidth = (i < 2 ? 1.3 : 0.8) * s;
      g.strokeStyle = "#1e130a";
      g.stroke();
    }

    parts.emit(14, dt, () => ({ x: cx, y: ground, data: { ox: cx, oy: cy + r * rand(0.78, 1.0), rad: r * rand(0.95, 1.35), speed: rand(2.4, 3.6), cx, cy, r }, life: rand(1, 1.8), size0: rand(13, 19) * s, tint: pick(DUST), alpha: 0.75, move: swirl, draw: drawDust }));
    parts.step(g, dt);

    for (const [x, h, period, phase, size] of PEBBLES) {
      const k = ((t + phase) / period) % 1;

      const y = ground - Math.sin(k * Math.PI) * h * r;

      g.globalAlpha = 1;
      g.fillStyle = "#86663f";
      g.strokeStyle = "#20160c";
      g.lineWidth = 0.8 * s;
      pebblePath(g, cx + x * r, y - size * s * 0.5, size * s);
      g.fill();
      g.stroke();
    }
  },
};
