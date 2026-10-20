import { rimGlow } from "./kit";
import type { AuraAnimation } from "./types";

import type { AuraParticle } from "@/components/battle/fx/auras/particles";
import { fadeInOut } from "@/components/battle/fx/runtime/easing";
import { pick, rand } from "@/components/battle/fx/runtime/geometry";
import { glow, spritePx } from "@/components/battle/fx/runtime/texture";

const HIGHLIGHT = ["#b46cff", "#8a3cff", "#d29bff"];

// phase is the orbit angle; the wisp drifts off the rim by `off`, growing at `drift` px/s.
interface Orbit {
  cx: number;
  cy: number;
  r: number;
  spin: number;
  drift: number;
  off: number;
}

function curl(p: AuraParticle<Orbit>, dt: number) {
  const o = p.data;

  p.phase += o.spin * dt;
  o.off += o.drift * dt;
  p.x = o.cx + Math.cos(p.phase) * (o.r + o.off);
  p.y = o.cy + Math.sin(p.phase) * (o.r + o.off) * 0.92 - p.age * 4;
}

function drawHighlight(g: CanvasRenderingContext2D, p: AuraParticle<Orbit>, k: number) {
  spritePx(g, glow(p.tint), p.x, p.y, p.size0 + (p.size1 - p.size0) * k, undefined, p.alpha * fadeInOut(k, 0.3));
}

export const decayAura: AuraAnimation = {
  frame(g, ctx, t, dt) {
    const { cx, cy, r, s, parts } = ctx;

    spritePx(g, glow("#5a1f8a"), cx, cy, r * 3.2, undefined, 0.35 + Math.sin(t * 1.3) * 0.08);

    rimGlow(g, ctx, "150,70,230", 0.4 + Math.sin(t * 1.7) * 0.1, 0.4);
    parts.emit(16, dt, () => ({ x: cx, y: cy, phase: rand(0, Math.PI * 2), data: { cx, cy, r, spin: rand(0.9, 1.6), drift: rand(2, 6) * s, off: rand(-2, 3) * s }, life: rand(1.2, 2), size0: rand(10, 14) * s, size1: rand(20, 26) * s, tint: "#1c0a26", additive: false, alpha: 0.55, move: curl }));
    parts.emit(14, dt, () => ({ x: cx, y: cy, phase: rand(0, Math.PI * 2), data: { cx, cy, r, spin: rand(1, 1.8), drift: rand(1, 4) * s, off: 0 }, life: rand(0.9, 1.5), size0: rand(9, 13) * s, size1: rand(14, 18) * s, tint: pick(HIGHLIGHT), alpha: 0.7, move: curl, draw: drawHighlight }));
    parts.step(g, dt);
  },
};
