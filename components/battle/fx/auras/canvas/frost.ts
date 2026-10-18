import { rand } from "../../runtime/geometry";
import { glow, sprite } from "../../runtime/texture";
import { twinkle } from "./shapes";
import { type AuraAnimation, onRim, rimGlow } from "./types";

// [angle, length × r] of the fixed ice needles around the rim.
const NEEDLES: [number, number][] = [[-2.6, 0.42], [-1.95, 0.3], [-1.2, 0.5], [-0.55, 0.32], [0.1, 0.45], [0.75, 0.3], [1.35, 0.4], [2.0, 0.33], [2.6, 0.48], [3.1, 0.28]];

function needles(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, width: number) {
  g.beginPath();

  for (const [a, len] of NEEDLES) {
    const x0 = cx + Math.cos(a) * r;

    const y0 = cy + Math.sin(a) * r;

    const tipX = cx + Math.cos(a) * r * (1 + len);

    const tipY = cy + Math.sin(a) * r * (1 + len);

    const nx = -Math.sin(a) * width;

    const ny = Math.cos(a) * width;

    g.moveTo(x0 + nx, y0 + ny);
    g.lineTo(tipX, tipY);
    g.lineTo(x0 - nx, y0 - ny);
  }

  g.closePath();
}

export const frostAura: AuraAnimation = {
  frame(g, ctx, t, dt) {
    const { cx, cy, r, s, parts } = ctx;

    const shimmer = 0.8 + Math.sin(t * 1.6) * 0.15;

    const tint = g.createRadialGradient(cx, cy, r * 0.45, cx, cy, r);

    tint.addColorStop(0, "rgba(170,225,255,0)");
    tint.addColorStop(1, `rgba(190,232,255,${0.45 * shimmer})`);
    g.fillStyle = tint;
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fill();

    rimGlow(g, ctx, "170,225,255", 0.9 * shimmer, 0.3);

    g.globalAlpha = 0.45;
    g.fillStyle = "#7fd0ff";
    needles(g, cx, cy, r * 0.96, 3.4 * s);
    g.fill();
    g.globalAlpha = 0.95;
    g.fillStyle = "#f2fbff";
    needles(g, cx, cy, r * 0.98, 1.6 * s);
    g.fill();

    for (const [a, len] of NEEDLES) {
      const tip = onRim(ctx, a, 1 + len);

      sprite(g, glow("#bfe9ff"), tip.x, tip.y, (6 * s) / 64, undefined, 0.5 + Math.sin(t * 2 + a * 3) * 0.3);
    }

    parts.emit(3.5, dt, () => ({ ...onRim(ctx, rand(0, Math.PI * 2), rand(0.85, 1.45)), vy: 3 * s, life: rand(0.6, 1.1), size0: rand(3, 4.5) * s, draw: (gg, p, k) => twinkle(gg, p.x, p.y, p.size0 * Math.sin(k * Math.PI), "#ffffff", 1) }));
    parts.step(g, dt);
  },
};
