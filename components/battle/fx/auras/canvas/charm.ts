import { fadeInOut } from "../../runtime/easing";
import { pick, rand } from "../../runtime/geometry";
import type { AuraParticle } from "../../runtime/particles";
import { heartPath } from "../../runtime/shapes";
import { glow, spritePx } from "../../runtime/texture";
import { rimGlow } from "./kit";
import type { AuraAnimation } from "./types";

const PINK = ["#ff5fa8", "#ff7ab8", "#ff3f8e"];

function float(p: AuraParticle, dt: number) {
  p.x += Math.sin(p.age * 3 + p.phase) * 8 * dt;
  p.y += p.vy * dt;
}

function drawHeart(g: CanvasRenderingContext2D, p: AuraParticle, k: number) {
  const a = fadeInOut(k, 0.25);

  const w = p.size0 * (0.7 + Math.min(1, k * 4) * 0.3);

  spritePx(g, glow("#ff6fb0"), p.x, p.y, w * 2.6, undefined, a * 0.6);
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = a;
  g.fillStyle = p.tint;
  g.strokeStyle = "#5a0a2a";
  g.lineWidth = 0.6;
  heartPath(g, p.x, p.y, w);
  g.fill();
  g.stroke();
  g.fillStyle = "#ffd6ea";
  g.beginPath();
  g.arc(p.x - w * 0.2, p.y - w * 0.12, w * 0.1, 0, Math.PI * 2);
  g.fill();
}

export const charmAura: AuraAnimation = {
  frame(g, ctx, t, dt) {
    const { cx, cy, r, s, parts } = ctx;

    rimGlow(g, ctx, "255,110,180", 0.45 + Math.sin(t * 2.6) * 0.2, 0.3);

    parts.emit(3.6, dt, () => {
      const side = Math.random() < 0.5 ? -1 : 1;

      return { x: cx + side * r * rand(0.75, 1.15), y: cy + r * rand(0, 0.5), vy: -rand(14, 20) * s, life: rand(1.4, 1.9), size0: rand(9, 12) * s, tint: pick(PINK), move: float, draw: drawHeart };
    });
    parts.step(g, dt);
  },
};
