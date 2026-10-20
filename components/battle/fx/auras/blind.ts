import { memo } from "./kit";
import type { AuraAnimation } from "./types";

import type { AuraParticle } from "@/components/battle/fx/auras/particles";
import { fadeInOut } from "@/components/battle/fx/runtime/easing";
import { pick, rand } from "@/components/battle/fx/runtime/geometry";
import { glow, spritePx } from "@/components/battle/fx/runtime/texture";

const HAZE = ["#3a1656", "#4a1c6e", "#26103a"];

function drawHaze(g: CanvasRenderingContext2D, p: AuraParticle, k: number) {
  spritePx(g, glow(p.tint), p.x, p.y, p.size0 * (1 + k * 0.4), p.size0 * 0.6, p.alpha * fadeInOut(k, 0.35), false);
}

export const blindAura: AuraAnimation = {
  frame(g, ctx, t, dt) {
    const { cx, cy, r, s, parts } = ctx;

    const y = cy - r * 0.18;

    const h = r * 0.47;

    const wave = Math.sin(t * 1.8);

    parts.emit(7, dt, () => {
      const side = Math.random() < 0.5 ? -1 : 1;

      return { x: cx + side * r * rand(0.6, 1.1), y: y + rand(-h, h), vx: side * rand(4, 10) * s, vy: rand(-3, 3) * s, life: rand(1.2, 2), size0: rand(14, 20) * s, tint: pick(HAZE), alpha: 0.6, draw: drawHaze };
    });
    parts.step(g, dt);

    g.globalCompositeOperation = "source-over";
    g.save();
    g.beginPath();
    g.arc(cx, cy, r * 1.04, 0, Math.PI * 2);
    g.clip();

    g.fillStyle = memo(ctx, "band", () => {
      const band = g.createLinearGradient(0, y - h, 0, y + h);

      band.addColorStop(0, "rgba(10,4,16,0)");
      band.addColorStop(0.22, "rgba(16,6,24,0.92)");
      band.addColorStop(0.5, "rgba(26,10,38,0.97)");
      band.addColorStop(0.78, "rgba(16,6,24,0.92)");
      band.addColorStop(1, "rgba(10,4,16,0)");

      return band;
    });
    g.beginPath();
    g.moveTo(cx - r * 1.1, y - h + wave * r * 0.03);
    g.quadraticCurveTo(cx, y - h - r * 0.06, cx + r * 1.1, y - h - wave * r * 0.03);
    g.lineTo(cx + r * 1.1, y + h - wave * r * 0.03);
    g.quadraticCurveTo(cx, y + h + r * 0.06, cx - r * 1.1, y + h + wave * r * 0.03);
    g.closePath();
    g.fill();

    const sx = cx + Math.sin(t * 0.9) * r * 0.7;

    spritePx(g, glow("#7a3ab0"), sx, y, r * 0.9, r * 0.25, 0.35);
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
    g.strokeStyle = "rgba(150,90,200,0.45)";
    g.lineWidth = 0.8 * s;
    g.beginPath();
    g.moveTo(cx - r * 1.1, y - h * 0.62);
    g.quadraticCurveTo(cx, y - h * 0.62 - r * 0.05, cx + r * 1.1, y - h * 0.62);
    g.moveTo(cx - r * 1.1, y + h * 0.62);
    g.quadraticCurveTo(cx, y + h * 0.62 + r * 0.05, cx + r * 1.1, y + h * 0.62);
    g.stroke();
    g.restore();

    g.globalCompositeOperation = "source-over";
    g.fillStyle = "rgba(22,8,32,0.9)";

    for (const [dy, len, ph] of [[-0.08, 0.75, 0], [0.12, 0.6, 1.3]] as const) {
      const ax = cx + r * 0.98;

      const ay = y + dy * r;

      const flap = Math.sin(t * 3.2 + ph) * r * 0.12;

      g.beginPath();
      g.moveTo(ax, ay - r * 0.1);
      g.quadraticCurveTo(ax + r * len * 0.5, ay - r * 0.05 + flap, ax + r * len, ay + r * 0.18 + flap * 1.4);
      g.lineTo(ax + r * len * 0.85, ay + r * 0.3 + flap);
      g.quadraticCurveTo(ax + r * len * 0.45, ay + r * 0.12 + flap * 0.6, ax, ay + r * 0.1);
      g.closePath();
      g.fill();
    }
  },
};
