import { rand } from "../../runtime/geometry";
import { glow, sprite } from "../../runtime/texture";
import { type AuraAnimation, type AuraParticle, outside, rimGlow } from "./types";

// pts = [y offset × r, length × r, bend]: a streak whips left to right, hugging the portrait when it passes it.
function streakY(cy: number, r: number, x: number, cx: number, dy: number, bend: number) {
  const near = Math.max(0, 1 - ((x - cx) / (r * 1.5)) ** 2);

  return cy + dy * r + Math.sign(dy || 1) * bend * r * near;
}

function makeDraw(cx: number, cy: number, r: number, s: number) {
  return (g: CanvasRenderingContext2D, p: AuraParticle, k: number) => {
    const [dy, len, bend] = p.pts ?? [0, 1, 0];

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

      g.lineTo(x, streakY(cy, r, x, cx, dy, bend));
    }

    g.stroke();
  };
}

export const hasteAura: AuraAnimation = {
  frame(g, ctx, t, dt) {
    const { cx, cy, r, s, parts } = ctx;

    const flick = 0.75 + Math.sin(t * 9) * 0.15 + Math.sin(t * 23) * 0.1;

    outside(g, ctx, () => sprite(g, glow("#7ff0ff"), cx, cy, (r * 3) / 64, undefined, 0.3 + flick * 0.2));
    rimGlow(g, ctx, "140,240,255", 0.75 * flick, 0.28);

    const draw = makeDraw(cx, cy, r, s);

    parts.emit(18, dt, () => {
      const dy = rand(-1.25, 1.25);

      const hugs = Math.abs(dy) > 0.75;

      return { x: cx, y: cy, pts: [hugs ? dy : Math.sign(dy) * rand(1.05, 1.3), rand(1.1, 1.9), rand(0.15, 0.35)], life: rand(0.35, 0.55), size0: rand(1.3, 2.4), alpha: rand(0.7, 1), draw };
    });
    parts.step(g, dt);
  },
};
