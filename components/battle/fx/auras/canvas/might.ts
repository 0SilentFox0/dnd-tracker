import { sword } from "../../runtime/shapes";
import { glow, spritePx } from "../../runtime/texture";
import { centredSprite, drawCentred, outside } from "./kit";
import type { AuraAnimation, AuraCtx } from "./types";

const GLINT_S = 3;

const LEN = 3.8;

// The blade is the same every frame: painted once and blitted.
function blade(ctx: AuraCtx) {
  const len = ctx.r * LEN;

  return centredSprite(ctx, "blade", len / 2 + 6, (g) => {
    g.rotate(-Math.PI / 2);
    g.translate(-len / 2, 0);
    g.shadowColor = "#ffd86b";
    g.shadowBlur = 8 * ctx.s;

    const grad = g.createLinearGradient(0, -len * 0.06, 0, len * 0.06);

    grad.addColorStop(0, "rgba(255,248,220,0.85)");
    grad.addColorStop(0.5, "rgba(255,220,120,0.7)");
    grad.addColorStop(1, "rgba(200,140,40,0.6)");
    sword(g, len, grad, "rgba(200,144,30,0.75)");
  });
}

export const mightAura: AuraAnimation = {
  frame(g, ctx, t) {
    const { cx, cy, r, s } = ctx;

    const pulse = 0.7 + Math.sin(t * 1.8) * 0.3;

    const len = r * LEN;

    outside(g, ctx, () => {
      spritePx(g, glow("#ffd86b"), cx, cy - r * 0.2, r * 1.6, len * 1.2, 0.55 * pulse);
      drawCentred(g, ctx, blade(ctx), cx, cy - r * 0.2);

      // A glint running up the blade.
      const k = (t % GLINT_S) / GLINT_S;

      if (k < 0.4) {
        const y = cy - r * 0.2 + len / 2 - (k / 0.4) * len * 0.8;

        spritePx(g, glow("#ffffff"), cx, y, 8 * s, 14 * s, Math.sin((k / 0.4) * Math.PI));
      }
    }, 2.2);
  },
};
