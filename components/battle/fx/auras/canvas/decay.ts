import { glow, pick, sprite } from "../../runtime/canvas";
import { rand } from "../../runtime/geometry";
import { type AuraAnimation, type AuraParticle, fadeInOut, rimGlow } from "./types";

const HIGHLIGHT = ["#b46cff", "#8a3cff", "#d29bff"];

// Orbit stored as phase = start angle, vx = angular speed, vy = radial speed; x/y are the computed position.
function curl(cx: number, cy: number, r: number) {
  return (p: AuraParticle, dt: number) => {
    p.phase += p.vx * dt;
    p.gravity += p.vy * dt;
    p.x = cx + Math.cos(p.phase) * (r + p.gravity);
    p.y = cy + Math.sin(p.phase) * (r + p.gravity) * 0.92 - p.age * 4;
  };
}

export const decayAura: AuraAnimation = {
  frame(g, ctx, t, dt) {
    const { cx, cy, r, s, parts } = ctx;

    const move = curl(cx, cy, r);

    sprite(g, glow("#5a1f8a"), cx, cy, (r * 3.2) / 64, undefined, 0.35 + Math.sin(t * 1.3) * 0.08);

    rimGlow(g, ctx, "150,70,230", 0.4 + Math.sin(t * 1.7) * 0.1, 0.4);
    parts.emit(16, dt, () => ({ x: cx, y: cy, phase: rand(0, Math.PI * 2), vx: rand(0.9, 1.6), vy: rand(2, 6) * s, gravity: rand(-2, 3) * s, life: rand(1.2, 2), size0: rand(10, 14) * s, size1: rand(20, 26) * s, tint: "#1c0a26", additive: false, alpha: 0.55, move }));
    parts.emit(14, dt, () => ({ x: cx, y: cy, phase: rand(0, Math.PI * 2), vx: rand(1, 1.8), vy: rand(1, 4) * s, life: rand(0.9, 1.5), size0: rand(9, 13) * s, size1: rand(14, 18) * s, tint: pick(HIGHLIGHT), alpha: 0.7, move, draw: (gg, p, k) => sprite(gg, glow(p.tint), p.x, p.y, (p.size0 + (p.size1 - p.size0) * k) / 64, undefined, p.alpha * fadeInOut(k, 0.3)) }));
    parts.step(g, dt);
  },
};
