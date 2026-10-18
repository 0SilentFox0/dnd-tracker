import { clamp01, easeOutCubic } from "../../runtime/easing";
import { hourglass } from "../../runtime/shapes";
import { glow, spritePx } from "../../runtime/texture";
import { outside } from "./kit";
import type { AuraAnimation } from "./types";

const DRAIN_S = 5;

const FLIP_S = 0.9;

const RIPPLE_S = 2.4;

export const hourglassAura: AuraAnimation = {
  frame(g, ctx, t) {
    const { cx, cy, r, s } = ctx;

    // Slow ripples spreading out from the portrait, as through thick water.
    outside(g, ctx, () => {
      for (let i = 0; i < 2; i++) {
        const k = ((t / RIPPLE_S + i / 2) % 1 + 1) % 1;

        const e = 1 - (1 - k) ** 3;

        g.globalCompositeOperation = "lighter";
        g.globalAlpha = (1 - k) * 0.55;
        g.strokeStyle = "#a8bcd8";
        g.lineWidth = 1.4 * s;
        g.beginPath();
        g.arc(cx, cy, r * (1 + e * 0.9), 0, Math.PI * 2);
        g.stroke();
      }

      spritePx(g, glow("#5a6e90"), cx, cy, r * 3.2, undefined, 0.35);
    });

    const cycle = DRAIN_S + FLIP_S;

    const u = ((t % cycle) + cycle) % cycle;

    const flip = clamp01((u - DRAIN_S) / FLIP_S);

    const sand = u < DRAIN_S ? 1 - u / DRAIN_S : 0;

    const x = cx;

    const y = cy - r * 1.58;

    const h = r * 1.15;

    spritePx(g, glow("#9fb8e0"), x, y, h * 1.8, h * 2, 0.55);
    g.save();
    g.translate(x, y);
    g.rotate(easeOutCubic(flip) * Math.PI);
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
    g.shadowColor = "rgba(0,0,0,0.8)";
    g.shadowBlur = 3 * s;
    hourglass(g, 0, 0, h, sand, u < DRAIN_S ? 1 : 0, "#dce8ff", "#f2dfa8");
    g.restore();
  },
};
