import type { AuraAnimation } from "./types";

import { leafPath } from "@/components/battle/fx/runtime/shapes";
import { glow, spritePx } from "@/components/battle/fx/runtime/texture";

export const markedAura: AuraAnimation = {
  frame(g, ctx, t) {
    const { cx, cy, r, s } = ctx;

    const pulse = 0.5 + Math.sin(t * 3.2) * 0.5;

    const ly = cy - r * 1.32;

    const len = r * (0.78 + pulse * 0.08);

    spritePx(g, glow("#2fe08a"), cx, ly, r * (1.6 + pulse * 0.5), undefined, 0.55 + pulse * 0.35);

    g.save();
    g.translate(cx, ly);
    // The leaf points up and to the right, stem at the bottom left.
    g.rotate(-Math.PI / 4);
    g.globalCompositeOperation = "source-over";
    g.fillStyle = "#0f8a52";
    leafPath(g, -len / 2, len / 2, len * 0.55);
    g.fill();
    g.globalCompositeOperation = "lighter";
    g.globalAlpha = 0.6 + pulse * 0.4;
    g.fillStyle = "#3dffa0";
    leafPath(g, -len * 0.41, len * 0.41, len * 0.82 * 0.55);
    g.fill();
    g.globalAlpha = 1;
    g.strokeStyle = "#e6fff2";
    g.lineWidth = 1 * s;
    g.beginPath();
    g.moveTo(-len * 0.45, 0);
    g.lineTo(len * 0.38, 0);
    g.stroke();
    g.restore();

    // Reticle ticks: the target is marked for the hunter.
    const spin = t * 0.6;

    g.globalCompositeOperation = "lighter";
    g.strokeStyle = `rgba(80,240,160,${0.55 + pulse * 0.35})`;
    g.lineWidth = 1.8 * s;
    g.lineCap = "round";
    g.beginPath();

    for (let i = 0; i < 4; i++) {
      const a = spin + (i * Math.PI) / 2;

      g.moveTo(cx + Math.cos(a) * r * 1.08, cy + Math.sin(a) * r * 1.08);
      g.lineTo(cx + Math.cos(a) * r * 1.3, cy + Math.sin(a) * r * 1.3);
    }

    g.stroke();
    g.lineWidth = 1 * s;
    g.strokeStyle = `rgba(80,240,160,${0.25 + pulse * 0.2})`;
    g.beginPath();
    g.arc(cx, cy, r * 1.12, 0, Math.PI * 2);
    g.stroke();
  },
};
