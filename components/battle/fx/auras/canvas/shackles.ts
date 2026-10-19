import { bezier } from "../../runtime/geometry";
import { chainLink, shackle } from "../../runtime/shapes";
import { glow, spritePx } from "../../runtime/texture";
import { onRim, outside } from "./kit";
import type { AuraAnimation } from "./types";

const TUG_S = 2.8;

// A slow haul every few seconds: the chains snap taut and the cuffs jolt towards the darkness.
function tug(t: number) {
  const k = (t / TUG_S) % 1;

  return k < 0.12 ? k / 0.12 : Math.max(0, 1 - (k - 0.12) / 0.5);
}

export const shacklesAura: AuraAnimation = {
  frame(g, ctx, t) {
    const { cx, cy, r, s } = ctx;

    const pull = tug(t);

    outside(g, ctx, () => {
      spritePx(g, glow("#120a1a"), cx, cy + r * 1.35, r * 3.8, r * 1.7, 0.85, false);
      spritePx(g, glow("#4a2a70"), cx, cy + r * 1.4, r * 3, r * 1.1, 0.35 + pull * 0.25);
    });

    for (const side of [-1, 1]) {
      const cuff = onRim(ctx, Math.PI / 2 - side * Math.PI * 0.24, 1.02);

      const stake = { x: cx + side * r * 2.05, y: cy + r * 2.05 };

      const end = { x: cuff.x + side * pull * r * 0.08, y: cuff.y + pull * r * 0.05 };

      const ctrl = { x: (end.x + stake.x) / 2, y: (end.y + stake.y) / 2 + r * 0.45 * (1 - pull) };

      const n = 9;

      g.globalAlpha = 1;

      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / n;

        const p = bezier(end, ctrl, stake, u);

        const q = bezier(end, ctrl, stake, Math.min(1, u + 0.03));

        chainLink(g, p.x, p.y, Math.atan2(q.y - p.y, q.x - p.x), i % 2 === 0, 0.5 * s, "#9a96aa");
      }

      shackle(g, end.x, end.y, r * 0.3, side * 0.5);
    }
  },
};
