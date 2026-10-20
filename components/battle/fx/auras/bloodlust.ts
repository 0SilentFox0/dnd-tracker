import { outside, rimGlow } from "./kit";
import type { AuraAnimation } from "./types";

import type { AuraParticle } from "@/components/battle/fx/auras/particles";
import { rand } from "@/components/battle/fx/runtime/geometry";
import { dropPath } from "@/components/battle/fx/runtime/shapes";
import { glow, spritePx } from "@/components/battle/fx/runtime/texture";

// The drop starts `d0` × r out on its ray, is pulled in along it and shrinks into the rim.
interface Ray {
  cx: number;
  cy: number;
  r: number;
  a: number;
  d0: number;
}

function drain(p: AuraParticle<Ray>) {
  const { cx, cy, r, a, d0 } = p.data;

  const k = p.age / p.life;

  const d = r * (d0 - (d0 - 1.02) * k ** 1.6);

  p.x = cx + Math.cos(a) * d;
  p.y = cy + Math.sin(a) * d;
}

function drawDrop(g: CanvasRenderingContext2D, p: AuraParticle<Ray>, k: number) {
  const { a } = p.data;

  const rad = p.size0 * (1 - k * 0.55);

  spritePx(g, glow("#c0101a"), p.x, p.y, rad * 4, undefined, 0.35 * Math.min(1, k * 4));
  g.save();
  g.translate(p.x, p.y);
  // The tail trails outward, the round end leads toward the portrait.
  g.rotate(a + Math.PI / 2);
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = Math.min(1, k * 5, (1 - k) * 6);
  g.fillStyle = "#8a0610";
  dropPath(g, 0, 0, rad, 2.2 + k * 1.6);
  g.fill();
  g.fillStyle = "#e02a2a";
  dropPath(g, -rad * 0.2, -rad * 0.1, rad * 0.55, 2.2 + k * 1.6);
  g.fill();
  g.fillStyle = "rgba(255,210,210,0.9)";
  g.beginPath();
  g.arc(-rad * 0.35, rad * 0.25, rad * 0.22, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

// Slow, heavy pulse with a sharp attack.
function throb(t: number) {
  const k = (t * 0.8) % 1;

  return Math.exp(-((k - 0.12) ** 2) / 0.01);
}

export const bloodlustAura: AuraAnimation = {
  frame(g, ctx, t, dt) {
    const { cx, cy, r, s, parts } = ctx;

    const p = throb(t);

    outside(g, ctx, () => {
      spritePx(g, glow("#3a0006"), cx, cy, r * 3.6, undefined, 0.75, false);
      spritePx(g, glow("#a00010"), cx, cy, r * (3 + p * 0.5), undefined, 0.45 + p * 0.45);
    });
    rimGlow(g, ctx, "200,20,30", 0.7 + p * 0.3, 0.32 + p * 0.12);

    parts.emit(9, dt, () => ({ x: cx, y: cy, data: { cx, cy, r, a: rand(0, Math.PI * 2), d0: rand(1.75, 2.1) }, life: rand(0.8, 1.2), size0: rand(2.8, 3.8) * s, move: drain, draw: drawDrop }));
    parts.step(g, dt);
  },
};
