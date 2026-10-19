import { type FxPoint, rand } from "../../runtime/geometry";
import { glow, spritePx } from "../../runtime/texture";
import { memo, rimGlow } from "./kit";
import type { AuraAnimation, AuraCtx } from "./types";

interface Antlers {
  beams: FxPoint[][];
  tips: FxPoint[];
}

// A beam with tines, in r units from (x, y); every branch is one polyline.
function grow(x: number, y: number, angle: number, len: number, depth: number, out: Antlers) {
  const ex = x + Math.cos(angle) * len;

  const ey = y + Math.sin(angle) * len;

  out.beams.push([{ x, y }, { x: ex, y: ey }]);

  if (depth === 0) {
    out.tips.push({ x: ex, y: ey });

    return;
  }

  grow(ex, ey, angle + (angle < -Math.PI / 2 ? -0.35 : 0.35), len * 0.7, depth - 1, out);
  grow((x + ex) / 2, (y + ey) / 2, angle + (angle < -Math.PI / 2 ? 0.6 : -0.6), len * 0.48, depth - 1, out);
}

const antlers = (ctx: AuraCtx) =>
  memo(ctx, "antlers", () => {
    const out: Antlers = { beams: [], tips: [] };

    grow(-0.35, -0.85, -1.95, 0.55, 2, out);
    grow(0.35, -0.85, -1.19, 0.55, 2, out);

    return out;
  });

export const stagAura: AuraAnimation = {
  frame(g, ctx, t, dt) {
    const { cx, cy, r, s, parts } = ctx;

    const breath = 0.75 + Math.sin(t * 1.4) * 0.25;

    rimGlow(g, ctx, "150,240,170", 0.4 * breath, 0.3);

    // The spirit stag's antlers rising behind the hero, glowing faintly.
    const { beams, tips } = antlers(ctx);

    g.globalCompositeOperation = "lighter";
    g.lineCap = "round";

    for (const [width, color] of [[3.2, "rgba(140,240,170,0.25)"], [1.3, "rgba(220,255,230,0.75)"]] as const) {
      g.strokeStyle = color;
      g.lineWidth = width * s;
      g.beginPath();

      for (const [a, b] of beams) {
        g.moveTo(cx + a.x * r, cy + a.y * r);
        g.lineTo(cx + b.x * r, cy + b.y * r);
      }

      g.globalAlpha = breath;
      g.stroke();
    }

    // Fireflies asleep in the tines, blinking.
    tips.forEach((p, n) => {
      const blink = Math.max(0, Math.sin(t * 2.2 + n * 1.9));

      spritePx(g, glow("#c8ff5a"), cx + p.x * r, cy + p.y * r, 8 * s, undefined, 0.7 * blink);
      spritePx(g, glow("#f0ff9a"), cx + p.x * r, cy + p.y * r, 2.6 * s, undefined, blink);
    });

    // Now and then one wakes and wanders down round the portrait.
    parts.emit(0.8, dt, () => {
      const tip = tips[Math.floor(rand(0, tips.length))];

      return { x: cx + tip.x * r, y: cy + tip.y * r, vx: rand(-10, 10) * s, vy: rand(4, 12) * s, life: rand(1.4, 2), size0: 3 * s, tint: "#e8ff7a" };
    });
    parts.step(g, dt);
    g.globalAlpha = 1;
  },
};
