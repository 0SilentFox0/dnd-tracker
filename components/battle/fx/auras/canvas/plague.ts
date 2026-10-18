import { pick, rand } from "../../runtime/geometry";
import { glow, sprite } from "../../runtime/texture";
import { type AuraAnimation, type AuraParticle, outside } from "./types";

const SPORE = ["#d4ff7a", "#8be04a", "#5fcf3a"];

function drift(p: AuraParticle, dt: number) {
  p.x += (p.vx + Math.sin(p.age * 3 + p.phase) * 9) * dt;
  p.y += p.vy * dt;
}

export const plagueAura: AuraAnimation = {
  frame(g, ctx, t, dt) {
    const { cx, cy, r, s, parts } = ctx;

    const pulse = 0.6 + Math.sin(t * 2.2) * 0.15;

    outside(g, ctx, () => sprite(g, glow("#4fd03a"), cx, cy + r * 0.7, (r * 3) / 64, (r * 2.2) / 64, pulse));
    sprite(g, glow("#3fae2a"), cx, cy + r * 0.85, (r * 1.8) / 64, (r * 1) / 64, pulse * 0.7);

    parts.emit(11, dt, () => ({ x: cx + rand(-r * 1.1, r * 1.1), y: cy + r * rand(0.3, 1.05), vx: rand(-3, 3) * s, vy: -rand(10, 20) * s, life: rand(1.4, 2.4), size0: rand(7, 11) * s, size1: rand(4, 6) * s, tint: pick(SPORE), move: drift }));
    parts.step(g, dt);
  },
};
