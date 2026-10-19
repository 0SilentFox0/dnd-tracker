import { rand } from "../../runtime/geometry";
import { crescent, twinkle } from "../../runtime/shapes";
import { glow, spritePx } from "../../runtime/texture";
import { centredSprite, drawCentred, rimGlow, twinkleDraw } from "./kit";
import type { AuraAnimation } from "./types";

const sparkle = twinkleDraw("#cfe0ff", 0.9);

const MOON_LEVELS = 12;

function moonPaint(g: CanvasRenderingContext2D, R: number, s: number, pulse: number) {
  g.rotate(-0.35);
  g.globalAlpha = 0.3 + pulse * 0.35;

  const fill = g.createLinearGradient(-R, -R, R * 0.4, R);

  fill.addColorStop(0, "#ffffff");
  fill.addColorStop(0.55, "#dfe8f6");
  fill.addColorStop(1, "#9eb3d2");
  g.fillStyle = fill;
  g.shadowColor = "#cfe0ff";
  g.shadowBlur = (3 + pulse * 5) * s;
  g.lineWidth = 0.8 * s;
  g.strokeStyle = "rgba(90,110,150,0.8)";
  crescent(g, 0, 0, R);
}

export const moonmarkAura: AuraAnimation = {
  frame(g, ctx, t, dt) {
    const { cx, cy, r, s, parts } = ctx;

    const pulse = 0.5 + Math.sin(t * 2.2) * 0.5;

    const mx = cx;

    const my = cy - r * 1.36 + Math.sin(t * 1.4) * r * 0.04;

    const R = r * 0.5;

    rimGlow(g, ctx, "190,215,255", 0.45 + pulse * 0.35, 0.28);
    spritePx(g, glow("#9fc2ff"), mx, my, r * (1.7 + pulse * 0.5), undefined, 0.3 + pulse * 0.35);

    // Blur and alpha follow the pulse; a few pre-rendered steps replace a live shadowBlur every frame.
    const level = Math.round(pulse * MOON_LEVELS);

    const moon = centredSprite(ctx, `moon${level}`, R + 10 * s, (lg) => moonPaint(lg, R, s, level / MOON_LEVELS));

    drawCentred(g, ctx, moon, mx, my);

    for (let i = 0; i < 3; i++) {
      const a = t * 0.5 + (i * Math.PI * 2) / 3;

      const tw = 0.5 + Math.sin(t * 3 + i * 2) * 0.5;

      twinkle(g, mx + Math.cos(a) * R * 2, my + Math.sin(a) * R * 0.9, (1.5 + tw * 2) * s, "#e8f0ff", 0.4 + tw * 0.6);
    }

    g.globalAlpha = 1;
    parts.emit(5, dt, () => {
      const a = rand(-Math.PI, Math.PI);

      return { x: cx + Math.cos(a) * r * rand(1.05, 1.5), y: cy + Math.sin(a) * r * rand(1.05, 1.4), vy: -rand(2, 6) * s, life: rand(0.8, 1.5), size0: rand(1.8, 3) * s, draw: sparkle };
    });
    parts.step(g, dt);
  },
};
