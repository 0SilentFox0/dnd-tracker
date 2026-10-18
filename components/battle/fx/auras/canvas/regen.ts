import { pick, rand } from "../../runtime/geometry";
import { glow, sprite } from "../../runtime/texture";
import { type AuraAnimation, type AuraParticle, fadeInOut, rimGlow } from "./types";

const MOTE = ["#c8ffb0", "#7fe88a", "#5fd27a"];

function drawPlus(g: CanvasRenderingContext2D, p: AuraParticle, k: number) {
  const a = fadeInOut(k, 0.25);

  const h = p.size0 / 2;

  const w = h * 0.38;

  sprite(g, glow("#6fe07a"), p.x, p.y, (p.size0 * 2.2) / 64, undefined, a * 0.7);
  g.globalCompositeOperation = "lighter";
  g.globalAlpha = a;
  g.fillStyle = "#d8ffd0";
  g.fillRect(p.x - w, p.y - h, w * 2, h * 2);
  g.fillRect(p.x - h, p.y - w, h * 2, w * 2);
}

export const regenAura: AuraAnimation = {
  frame(g, ctx, t, dt) {
    const { cx, cy, r, s, parts } = ctx;

    const breath = 0.5 + Math.sin(t * 2.4) * 0.3;

    rimGlow(g, ctx, "110,230,130", 0.35 + breath * 0.55, 0.3 + breath * 0.15);

    parts.emit(6, dt, () => ({ x: cx + rand(-r * 1.1, r * 1.1), y: cy + r * rand(0.1, 0.9), vy: -rand(12, 20) * s, life: rand(1.1, 1.8), size0: rand(5, 8) * s, size1: 3 * s, tint: pick(MOTE) }));
    parts.emit(1.6, dt, () => ({ x: cx + rand(-r * 1.15, r * 1.15) * (Math.random() < 0.5 ? 1 : -1), y: cy + r * rand(0, 0.6), vy: -rand(14, 20) * s, life: rand(1.1, 1.5), size0: rand(6, 8) * s, draw: drawPlus }));
    parts.step(g, dt);
  },
};
