import { glow, pick, sprite } from "../../runtime/canvas";
import { rand } from "../../runtime/geometry";
import { type AuraAnimation, type AuraParticle, fadeInOut, onRim, outside } from "./types";

const FLAME = ["#fff3b0", "#ffd25a", "#ff8a1f", "#ff4a00"];

const EMBER = ["#fff3b0", "#ffd25a"];

function tongue(g: CanvasRenderingContext2D, p: AuraParticle, k: number) {
  const w = p.size0 + (p.size1 - p.size0) * k;

  sprite(g, glow(p.tint), p.x, p.y, w / 64, (w * 1.9) / 64, p.alpha * fadeInOut(k, 0.15));
}

export const burningAura: AuraAnimation = {
  frame(g, ctx, t, dt) {
    const { cx, cy, r, s, parts } = ctx;

    const flicker = 0.75 + Math.sin(t * 13) * 0.1 + Math.sin(t * 7.3) * 0.1;

    outside(g, ctx, () => sprite(g, glow("#ff6a10"), cx, cy + r * 0.85, (r * 3) / 64, (r * 1.8) / 64, 0.75 * flicker));
    sprite(g, glow("#ff7a1a"), cx, cy + r * 0.95, (r * 2) / 64, (r * 0.9) / 64, 0.55 * flicker);

    parts.emit(46, dt, () => {
      const at = onRim(ctx, rand(Math.PI * 0.02, Math.PI * 0.98), rand(0.92, 1.05));

      const side = (at.x - cx) / r;

      return { ...at, vx: side * rand(4, 10) * s, vy: -rand(24, 42) * s, gravity: -60 * s, drag: 0.8, life: rand(0.4, 0.75), size0: rand(13, 20) * s, size1: 2 * s, tint: pick(FLAME), alpha: 0.95, draw: tongue };
    });
    parts.emit(5, dt, () => ({ x: cx + rand(-r, r), y: cy + r * rand(0.6, 1), vx: rand(-8, 8) * s, vy: -rand(30, 50) * s, gravity: -10 * s, life: rand(0.8, 1.3), size0: 5 * s, size1: 2 * s, tint: pick(EMBER) }));
    parts.step(g, dt);
  },
};
