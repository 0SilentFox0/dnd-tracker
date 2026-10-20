import { onRim } from "./kit";
import type { AuraAnimation } from "./types";

import { glow, spritePx } from "@/components/battle/fx/runtime/texture";

const TWITCH_S = 2.2;

// Rim angles the strings bite at and where along the bar each one hangs from.
const STRINGS: [number, number][] = [[-Math.PI * 0.82, -0.5], [-Math.PI * 0.5, 0], [-Math.PI * 0.18, 0.5]];

export const stringsAura: AuraAnimation = {
  frame(g, ctx, t) {
    const { cx, cy, r, s } = ctx;

    const k = (t / TWITCH_S) % 1;

    const twitch = k < 0.08 ? Math.sin((k / 0.08) * Math.PI) : 0;

    const tilt = Math.sin(t * 1.3) * 0.12 + twitch * 0.25;

    const bar = { x: cx + Math.sin(t * 0.9) * r * 0.08, y: cy - r * 1.95 + twitch * r * 0.08 };

    const len = r * 1.5;

    g.lineCap = "round";

    for (const [angle, along] of STRINGS) {
      const end = onRim(ctx, angle, 1);

      const top = { x: bar.x + Math.cos(tilt) * along * len, y: bar.y + Math.sin(tilt) * along * len };

      g.globalCompositeOperation = "lighter";

      for (const [color, width, alpha] of [["#9a70ff", 2.6, 0.3], ["#f4f0ff", 0.9, 0.85]] as const) {
        g.globalAlpha = alpha;
        g.strokeStyle = color;
        g.lineWidth = width * s;
        g.beginPath();
        g.moveTo(top.x, top.y);
        g.lineTo(end.x, end.y - twitch * r * 0.05);
        g.stroke();
      }

      spritePx(g, glow("#c8b8ff"), end.x, end.y, 7 * s, undefined, 0.7 + twitch * 0.3);
    }

    g.save();
    g.translate(bar.x, bar.y);
    g.rotate(tilt);
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
    g.fillStyle = "#3a2618";
    g.strokeStyle = "#0a0604";
    g.lineWidth = 0.8 * s;
    g.beginPath();
    g.roundRect(-len * 0.6, -2 * s, len * 1.2, 4 * s, 2 * s);
    g.fill();
    g.stroke();
    g.beginPath();
    g.roundRect(-2 * s, -len * 0.2, 4 * s, len * 0.4, 2 * s);
    g.fill();
    g.stroke();
    g.restore();
  },
};
