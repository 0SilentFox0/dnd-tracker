import { rand } from "../../runtime/geometry";
import type { AuraParticle } from "../../runtime/particles";
import { feather } from "../../runtime/shapes";
import { glow, spritePx } from "../../runtime/texture";
import { memo, outside, rimGlow } from "./kit";
import type { AuraAnimation } from "./types";

const STREAK_LEN: [number, number] = [1.1, 1.9];

// A streak whips left to right at `dy` × r off centre and hugs the portrait (by `bend`) when it passes it.
interface Streak {
  cx: number;
  cy: number;
  r: number;
  s: number;
  dy: number;
  len: number;
  bend: number;
  grad: CanvasGradient;
}

function streakY({ cx, cy, r, dy, bend }: Streak, x: number) {
  const near = Math.max(0, 1 - ((x - cx) / (r * 1.5)) ** 2);

  return cy + dy * r + Math.sign(dy || 1) * bend * r * near;
}

// The gradient spans the streak from its tail at x = 0, so one per length serves every streak (moved by translate).
function streakGradient(g: CanvasRenderingContext2D, length: number) {
  const grad = g.createLinearGradient(0, 0, length, 0);

  grad.addColorStop(0, "rgba(200,245,255,0)");
  grad.addColorStop(0.75, "rgba(220,250,255,0.55)");
  grad.addColorStop(1, "rgba(255,255,255,0.95)");

  return grad;
}

function drawStreak(g: CanvasRenderingContext2D, p: AuraParticle<Streak>, k: number) {
  const { cx, r, s, len } = p.data;

  const head = cx - r * 2.3 + k * r * 4.8;

  const tail = head - len * r;

  g.globalCompositeOperation = "lighter";
  g.globalAlpha = Math.sin(k * Math.PI) * p.alpha;
  g.lineWidth = p.size0 * s;
  g.lineCap = "round";
  g.beginPath();

  for (let i = 0; i <= 10; i++) {
    const x = tail + ((head - tail) * i) / 10;

    g.lineTo(x, streakY(p.data, x));
  }

  g.save();
  g.translate(tail, 0);
  g.strokeStyle = p.data.grad;
  g.stroke();
  g.restore();
}

// A white feather caught in the wind: swept across, tumbling.
function drawFeather(g: CanvasRenderingContext2D, p: AuraParticle<{ spin: number }>, k: number) {
  g.save();
  g.translate(p.x, p.y);
  g.rotate(p.phase + k * p.data.spin);
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = Math.sin(k * Math.PI) * 0.95;
  feather(g, p.size0, "#f6fbff", "#9cc8dc");
  g.restore();
}

export const hasteAura: AuraAnimation = {
  frame(g, ctx, t, dt) {
    const { cx, cy, r, s, parts } = ctx;

    const flick = 0.75 + Math.sin(t * 9) * 0.15 + Math.sin(t * 23) * 0.1;

    outside(g, ctx, () => spritePx(g, glow("#7ff0ff"), cx, cy, r * 3, undefined, 0.3 + flick * 0.2));
    rimGlow(g, ctx, "140,240,255", 0.75 * flick, 0.28);

    const shortest = Math.floor(STREAK_LEN[0] * r);

    // Lengths snap to whole px, one gradient each, all built on the first frame.
    const grads = memo(ctx, "streaks", () => Array.from({ length: Math.ceil(STREAK_LEN[1] * r) - shortest + 1 }, (_, i) => streakGradient(g, shortest + i)));

    parts.emit(18, dt, () => {
      const dy = rand(-1.25, 1.25);

      const hugs = Math.abs(dy) > 0.75;

      const px = Math.round(rand(...STREAK_LEN) * r);

      return { x: cx, y: cy, data: { cx, cy, r, s, dy: hugs ? dy : Math.sign(dy) * rand(1.05, 1.3), len: px / r, bend: rand(0.15, 0.35), grad: grads[px - shortest] }, life: rand(0.35, 0.55), size0: rand(1.3, 2.4), alpha: rand(0.7, 1), draw: drawStreak };
    });
    parts.emit(2.2, dt, () => ({ x: cx - r * 1.6, y: cy + rand(-0.4, 1.1) * r, vx: rand(90, 140) * s, vy: rand(-20, 5) * s, life: rand(0.7, 1), size0: rand(11, 15) * s, data: { spin: rand(-6, 6) }, draw: drawFeather }));
    parts.step(g, dt);
  },
};
