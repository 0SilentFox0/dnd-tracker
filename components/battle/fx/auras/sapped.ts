import { onRim, outside } from "./kit";
import type { AuraAnimation } from "./types";

import type { AuraParticle } from "@/components/battle/fx/auras/particles";
import { fadeInOut } from "@/components/battle/fx/runtime/easing";
import { pick, rand } from "@/components/battle/fx/runtime/geometry";
import { taperedStroke } from "@/components/battle/fx/runtime/shapes";
import { glow, spritePx } from "@/components/battle/fx/runtime/texture";

const FOG = ["#8a8690", "#6e6a76"];

const LIGHT = ["#ffd27a", "#ffb84a", "#fff1c8"];

// Two shadow tendrils latched onto the portrait: [rim angle, sway phase].
const TENDRILS: [number, number][] = [[Math.PI * 0.85, 0], [Math.PI * 0.15, 2.2]];

function drawFog(g: CanvasRenderingContext2D, p: AuraParticle, k: number) {
  spritePx(g, glow(p.tint), p.x, p.y, p.size0 * (1 + k * 0.6), p.size0 * 0.55, 0.35 * fadeInOut(k, 0.3), false);
}

export const sappedAura: AuraAnimation = {
  frame(g, ctx, t, dt) {
    const { cx, cy, r, s, parts } = ctx;

    outside(g, ctx, () => spritePx(g, glow("#2a2630"), cx, cy + r * 0.9, r * 3.4, r * 1.6, 0.6, false));

    for (const [angle, phase] of TENDRILS) {
      const root = onRim(ctx, angle, 1.0);

      const out = Math.cos(angle) > 0 ? 1 : -1;

      const pts = Array.from({ length: 10 }, (_, n) => {
        const u = n / 9;

        return { x: root.x + out * u * r * 1.05, y: root.y + u * r * 0.55 + Math.sin(u * 5 + t * 2.2 + phase) * r * 0.08 * u };
      }).reverse();

      g.globalCompositeOperation = "source-over";
      g.globalAlpha = 1;
      g.lineCap = "round";
      taperedStroke(g, pts, "rgba(130,90,180,0.5)", 5 * s, 0.7, 1.2 * s);
      taperedStroke(g, pts, "#0d0814", 3.2 * s, 0.75, 0.8 * s);

      // Warm motes of strength slipping out along it.
      const k = ((t * 0.7 + phase) % 1 + 1) % 1;

      const p = pts[Math.min(pts.length - 1, Math.floor((1 - k) * (pts.length - 1)))];

      spritePx(g, glow(LIGHT[Math.floor(t + phase) % 3]), p.x, p.y, 7 * s, undefined, Math.sin(k * Math.PI) * 0.9);
    }

    parts.emit(5, dt, () => {
      const side = Math.random() < 0.5 ? -1 : 1;

      return { x: cx + side * r * rand(0.7, 1.2), y: cy + r * rand(0.3, 0.9), vx: -side * rand(3, 7) * s, vy: -rand(1, 3) * s, life: rand(1.4, 2), size0: rand(14, 20) * s, tint: pick(FOG), draw: drawFog };
    });
    parts.step(g, dt);
  },
};
