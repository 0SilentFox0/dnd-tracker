import { type FxPoint, rand } from "../../runtime/geometry";
import type { AuraParticle } from "../../runtime/particles";
import { polyline } from "../../runtime/shapes";
import { glow, spritePx } from "../../runtime/texture";
import { rimGlow } from "./kit";
import type { AuraAnimation } from "./types";

function bolt(cx: number, cy: number, r: number, s: number): FxPoint[] {
  const a0 = rand(0, Math.PI * 2);

  const span = rand(0.5, 0.9);

  return Array.from({ length: 7 }, (_, i) => {
    const a = a0 + (span * i) / 6;

    const rad = r + (i === 0 || i === 6 ? 0 : rand(-2, 4.5) * s);

    return { x: cx + Math.cos(a) * rad, y: cy + Math.sin(a) * rad };
  });
}

function drawArc(g: CanvasRenderingContext2D, p: AuraParticle<FxPoint[]>, k: number) {
  const tip = p.data[p.data.length - 1];

  const a = k < 0.5 ? 1 : (1 - k) * 2;

  g.globalCompositeOperation = "lighter";
  g.lineCap = "round";
  g.lineJoin = "round";
  g.globalAlpha = a * 0.5;
  g.strokeStyle = "#5aa8ff";
  g.lineWidth = p.size0 * 2.6;
  polyline(g, p.data);
  g.globalAlpha = a;
  g.strokeStyle = "#f4fbff";
  g.lineWidth = p.size0;
  polyline(g, p.data);
  spritePx(g, glow("#9fd2ff"), tip.x, tip.y, 7 * p.size0, undefined, a);
}

export const staticAura: AuraAnimation = {
  frame(g, ctx, t, dt) {
    const { cx, cy, r, s, parts } = ctx;

    const buzz = Math.random() < 0.15 ? 1 : 0.55;

    rimGlow(g, ctx, "120,190,255", 0.7 * buzz, 0.3);

    parts.emit(11, dt, () => ({ x: cx, y: cy, life: rand(0.14, 0.26), size0: 1.2 * s, data: bolt(cx, cy, r, s), draw: drawArc }));
    parts.emit(4, dt, () => {
      const a = rand(0, Math.PI * 2);

      return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, vx: Math.cos(a) * rand(15, 35) * s, vy: Math.sin(a) * rand(15, 35) * s, life: rand(0.15, 0.3), size0: 4 * s, size1: 1 * s, tint: "#cfe8ff" };
    });
    parts.step(g, dt);
  },
};
