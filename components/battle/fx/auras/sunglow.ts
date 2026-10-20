import { rimGlow } from "./kit";
import type { AuraAnimation } from "./types";

import { pick, rand } from "@/components/battle/fx/runtime/geometry";
import { glow, spritePx } from "@/components/battle/fx/runtime/texture";

const WARM = ["#fff1b8", "#ffd86b", "#ffb347"];

export const sunglowAura: AuraAnimation = {
  frame(g, ctx, t, dt) {
    const { cx, cy, r, s, parts } = ctx;

    const breath = 0.8 + Math.sin(t * 1.6) * 0.2;

    rimGlow(g, ctx, "255,200,90", 0.45 * breath, 0.35);

    // A little sun keeps shining over the hero, its rays turning slowly.
    const x = cx;

    const y = cy - r * 1.55;

    const sr = r * 0.26;

    spritePx(g, glow("#ffd86b"), x, y, sr * 7 * breath, undefined, 0.75);
    g.save();
    g.translate(x, y);
    g.rotate(t * 0.5);
    g.globalCompositeOperation = "lighter";
    g.fillStyle = "rgba(255,226,150,0.8)";

    for (let n = 0; n < 10; n++) {
      g.rotate((Math.PI * 2) / 10);
      g.beginPath();
      g.moveTo(sr * 0.8, -sr * 0.25);
      g.lineTo(sr * (n % 2 ? 2 : 2.6), 0);
      g.lineTo(sr * 0.8, sr * 0.25);
      g.fill();
    }

    g.fillStyle = "#fffbe8";
    g.beginPath();
    g.arc(0, 0, sr, 0, Math.PI * 2);
    g.fill();
    g.restore();

    parts.emit(4, dt, () => ({ x: x + rand(-sr, sr), y: y + sr, vx: rand(-8, 8) * s, vy: rand(14, 22) * s, life: rand(0.9, 1.3), size0: rand(3, 5) * s, size1: 1.5 * s, tint: pick(WARM) }));
    parts.step(g, dt);
  },
};
