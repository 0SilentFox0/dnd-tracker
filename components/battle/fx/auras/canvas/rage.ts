import { pick, rand } from "../../runtime/geometry";
import { glow, sprite } from "../../runtime/texture";
import { type AuraAnimation, type AuraParticle, fadeInOut, onRim, outside, rimGlow } from "./types";

const WISP = ["#ff3b2f", "#e01010", "#ff6a3a"];

function drawWisp(g: CanvasRenderingContext2D, p: AuraParticle, k: number) {
  const w = p.size0 * (1 - k * 0.5);

  sprite(g, glow(p.tint), p.x + Math.sin(p.age * 6 + p.phase) * 1.5, p.y, w / 64, (w * 2.8) / 64, p.alpha * fadeInOut(k, 0.25));
}

// Double "heartbeat" pulse once per second.
function beat(t: number) {
  const k = t % 1;

  return Math.max(Math.exp(-((k - 0.1) ** 2) / 0.004), 0.7 * Math.exp(-((k - 0.32) ** 2) / 0.004));
}

export const rageAura: AuraAnimation = {
  frame(g, ctx, t, dt) {
    const { cx, cy, r, s, parts } = ctx;

    const p = beat(t * 1.3);

    outside(g, ctx, () => sprite(g, glow("#e0100a"), cx, cy, (r * (3.4 + p * 0.5)) / 64, undefined, 0.55 + p * 0.4));
    sprite(g, glow("#ff2a10"), cx, cy, (r * 2.2) / 64, undefined, 0.12 + p * 0.18);
    rimGlow(g, ctx, "255,50,30", 0.6 + p * 0.4, 0.3 + p * 0.15);

    parts.emit(12, dt, () => ({ ...onRim(ctx, rand(-Math.PI * 1.05, 0.05), rand(0.95, 1.1)), vy: -rand(18, 30) * s, life: rand(0.6, 1), size0: rand(5, 8) * s, tint: pick(WISP), alpha: 0.9, draw: drawWisp }));
    parts.step(g, dt);
  },
};
