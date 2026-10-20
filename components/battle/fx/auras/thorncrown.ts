import { drawLayer,onRim, rimGlow, staticLayer } from "./kit";
import type { AuraAnimation, AuraCtx } from "./types";

import type { AuraParticle } from "@/components/battle/fx/auras/particles";
import { fadeInOut } from "@/components/battle/fx/runtime/easing";
import { rand } from "@/components/battle/fx/runtime/geometry";
import { thornPath } from "@/components/battle/fx/runtime/shapes";
import { glow, spritePx } from "@/components/battle/fx/runtime/texture";

const BEAT_S = 1.6;

// Black thorns round the crown of the head, pointing out; painted once.
function paintCrown(g: CanvasRenderingContext2D, ctx: AuraCtx) {
  const { r, s } = ctx;

  const fill = g.createLinearGradient(0, 0, 0, -r * 0.5);

  fill.addColorStop(0, "#050206");
  fill.addColorStop(0.6, "#1a0610");
  fill.addColorStop(1, "#5a0a24");

  g.lineCap = "round";
  g.strokeStyle = "#140408";
  g.lineWidth = 2.6 * s;
  g.beginPath();
  g.arc(ctx.cx, ctx.cy, r * 1.04, Math.PI * 1.08, Math.PI * 1.92);
  g.stroke();

  for (let n = 0; n <= 8; n++) {
    const a = Math.PI * (1.1 + (n / 8) * 0.8);

    const p = onRim(ctx, a, 1.02);

    g.save();
    g.translate(p.x, p.y);
    g.rotate(a + Math.PI / 2 + rand(-0.2, 0.2));
    thornPath(g, r * (n % 2 ? 0.34 : 0.48), r * 0.09, rand(-r * 0.06, r * 0.06));
    g.fillStyle = fill;
    g.fill();
    g.strokeStyle = "rgba(255,60,100,0.4)";
    g.lineWidth = 0.7 * s;
    g.stroke();
    g.restore();
  }
}

function drawDrop(g: CanvasRenderingContext2D, p: AuraParticle, k: number) {
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = fadeInOut(k, 0.2);
  g.fillStyle = "#b0103a";
  g.beginPath();
  g.ellipse(p.x, p.y, p.size0 * 0.5, p.size0 * 0.75, 0, 0, Math.PI * 2);
  g.fill();
}

export const thorncrownAura: AuraAnimation = {
  frame(g, ctx, t, dt) {
    const { cx, cy, r, s, parts } = ctx;

    const k = (t / BEAT_S) % 1;

    const beat = Math.exp(-(((k - 0.08) / 0.06) ** 2)) + 0.6 * Math.exp(-(((k - 0.26) / 0.06) ** 2));

    spritePx(g, glow("#c0104a"), cx, cy - r * 0.9, r * 2.8, r * 1.6, 0.25 + beat * 0.45);
    rimGlow(g, ctx, "220,30,80", 0.25 + beat * 0.6, 0.25);
    drawLayer(g, staticLayer(ctx, "crown", (lg) => paintCrown(lg, ctx)));

    parts.emit(0.8, dt, () => {
      const p = onRim(ctx, Math.PI * rand(1.15, 1.85), 0.98);

      return { x: p.x, y: p.y, vy: rand(10, 16) * s, life: rand(1, 1.5), size0: rand(2.4, 3.2) * s, draw: drawDrop };
    });
    parts.step(g, dt);
  },
};
