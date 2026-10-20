import { outside } from "./kit";
import type { AuraAnimation } from "./types";

import type { AuraParticle } from "@/components/battle/fx/auras/particles";
import { fadeInOut } from "@/components/battle/fx/runtime/easing";
import { pick, rand } from "@/components/battle/fx/runtime/geometry";
import { glow, spritePx } from "@/components/battle/fx/runtime/texture";

const WISP = ["#b04dff", "#8a2be2", "#d07aff"];

function drawWisp(g: CanvasRenderingContext2D, p: AuraParticle, k: number) {
  spritePx(g, glow(p.tint), p.x + Math.sin(p.age * 4 + p.phase) * 1.5, p.y, p.size0, p.size0 * 3.2, p.alpha * fadeInOut(k, 0.3));
}

export const curseAura: AuraAnimation = {
  frame(g, ctx, t, dt) {
    const { cx, cy, r, s, parts } = ctx;

    const sink = (t * 0.5) % 1;

    outside(g, ctx, () => {
      spritePx(g, glow("#2a0838"), cx, cy - r * 1.05, r * 2.8, r * 1.5, 0.8, false);
      spritePx(g, glow("#9a30ff"), cx, cy - r * 0.95, r * 2.6, r * 1.5, 0.6 + Math.sin(t * 2) * 0.12);
    });
    spritePx(g, glow("#9a30ff"), cx, cy - r * 0.6 + sink * r * 0.9, r * 1.8, r * 0.7, 0.35 * (1 - sink));

    parts.emit(9, dt, () => ({ x: cx + rand(-r * 1.05, r * 1.05), y: cy - r * rand(1.1, 1.5), vy: rand(12, 22) * s, life: rand(0.9, 1.5), size0: rand(3.5, 5) * s, tint: pick(WISP), alpha: 0.85, draw: drawWisp }));
    parts.step(g, dt);
  },
};
