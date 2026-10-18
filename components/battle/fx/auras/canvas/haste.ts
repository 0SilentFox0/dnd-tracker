import { rand } from "../../runtime/geometry";
import type { AuraParticle } from "../../runtime/particles";
import { glow, spritePx } from "../../runtime/texture";
import { outside, rimGlow } from "./kit";
import type { AuraAnimation } from "./types";

// A streak whips left to right at `dy` × r off centre and hugs the portrait (by `bend`) when it passes it.
interface Streak {
  cx: number;
  cy: number;
  r: number;
  s: number;
  dy: number;
  len: number;
  bend: number;
}

function streakY({ cx, cy, r, dy, bend }: Streak, x: number) {
  const near = Math.max(0, 1 - ((x - cx) / (r * 1.5)) ** 2);

  return cy + dy * r + Math.sign(dy || 1) * bend * r * near;
}

function drawStreak(g: CanvasRenderingContext2D, p: AuraParticle<Streak>, k: number) {
  const { cx, r, s, len } = p.data;

  const head = cx - r * 2.3 + k * r * 4.8;

  const tail = head - len * r;

  const a = Math.sin(k * Math.PI);

  const grad = g.createLinearGradient(tail, 0, head, 0);

  grad.addColorStop(0, "rgba(200,245,255,0)");
  grad.addColorStop(0.75, `rgba(220,250,255,${0.55 * a * p.alpha})`);
  grad.addColorStop(1, `rgba(255,255,255,${0.95 * a * p.alpha})`);
  g.globalCompositeOperation = "lighter";
  g.globalAlpha = 1;
  g.strokeStyle = grad;
  g.lineWidth = p.size0 * s;
  g.lineCap = "round";
  g.beginPath();

  for (let i = 0; i <= 10; i++) {
    const x = tail + ((head - tail) * i) / 10;

    g.lineTo(x, streakY(p.data, x));
  }

  g.stroke();
}

export const hasteAura: AuraAnimation = {
  frame(g, ctx, t, dt) {
    const { cx, cy, r, s, parts } = ctx;

    const flick = 0.75 + Math.sin(t * 9) * 0.15 + Math.sin(t * 23) * 0.1;

    outside(g, ctx, () => spritePx(g, glow("#7ff0ff"), cx, cy, r * 3, undefined, 0.3 + flick * 0.2));
    rimGlow(g, ctx, "140,240,255", 0.75 * flick, 0.28);

    parts.emit(18, dt, () => {
      const dy = rand(-1.25, 1.25);

      const hugs = Math.abs(dy) > 0.75;

      return { x: cx, y: cy, data: { cx, cy, r, s, dy: hugs ? dy : Math.sign(dy) * rand(1.05, 1.3), len: rand(1.1, 1.9), bend: rand(0.15, 0.35) }, life: rand(0.35, 0.55), size0: rand(1.3, 2.4), alpha: rand(0.7, 1), draw: drawStreak };
    });
    parts.step(g, dt);
  },
};
