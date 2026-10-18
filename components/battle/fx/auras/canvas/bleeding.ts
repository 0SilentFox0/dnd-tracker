import { rand } from "../../runtime/geometry";
import type { AuraParticle } from "../../runtime/particles";
import { dropPath } from "../../runtime/shapes";
import { glow, spritePx } from "../../runtime/texture";
import { onRim, outside } from "./kit";
import type { AuraAnimation } from "./types";

const HANG = 0.45;

function drip(p: AuraParticle, dt: number) {
  if (p.age < HANG) return;

  p.vy += p.gravity * dt;
  p.y += p.vy * dt;
}

function drawDrop(g: CanvasRenderingContext2D, p: AuraParticle, k: number) {
  const swell = Math.min(1, p.age / HANG);

  const rad = p.size0 * (0.5 + swell * 0.5);

  const stretch = 1.6 + Math.min(1.4, p.vy / 80);

  g.globalCompositeOperation = "source-over";
  g.globalAlpha = Math.min(1, (1 - k) * 2.5);
  g.fillStyle = "#b0101c";
  dropPath(g, p.x, p.y, rad, stretch);
  g.fill();
  g.fillStyle = "#ff8a8a";
  g.beginPath();
  g.arc(p.x - rad * 0.35, p.y - rad * 0.1, rad * 0.28, 0, Math.PI * 2);
  g.fill();
}

export const bleedingAura: AuraAnimation = {
  frame(g, ctx, t, dt) {
    const { cx, cy, r, s, parts } = ctx;

    outside(g, ctx, () => spritePx(g, glow("#d4141e"), cx, cy + r * 0.85, r * 2.4, r * 1.3, 0.55 + Math.sin(t * 3) * 0.1));

    g.lineCap = "round";
    g.globalAlpha = 0.85;
    g.strokeStyle = "#8a0a14";
    g.lineWidth = 2.6 * s;
    g.beginPath();
    g.arc(cx, cy, r - 0.5 * s, Math.PI * 0.2, Math.PI * 0.8);
    g.stroke();
    g.globalAlpha = 1;
    g.strokeStyle = "#e0303a";
    g.lineWidth = 1 * s;
    g.beginPath();
    g.arc(cx, cy, r - 0.5 * s, Math.PI * 0.28, Math.PI * 0.72);
    g.stroke();

    parts.emit(3.4, dt, () => ({ ...onRim(ctx, rand(Math.PI * 0.25, Math.PI * 0.75), 0.97), life: rand(1, 1.3), gravity: 240 * s, size0: rand(3, 4) * s, move: drip, draw: drawDrop }));
    parts.step(g, dt);
  },
};
