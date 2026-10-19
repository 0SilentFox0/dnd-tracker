import { clamp01 } from "../../runtime/easing";
import { arrow } from "../../runtime/shapes";
import type { AuraAnimation } from "./types";

const RING = 1.38;

const VOLLEY_S = 2.2;

const FLY_S = 0.22;

export const deflectAura: AuraAnimation = {
  frame(g, ctx, t) {
    const { cx, cy, r, s } = ctx;

    const R = r * RING;

    g.globalCompositeOperation = "lighter";
    g.lineCap = "round";
    g.globalAlpha = 0.25;
    g.strokeStyle = "#ffe39a";
    g.lineWidth = 3 * s;
    g.beginPath();
    g.arc(cx, cy, R, 0, Math.PI * 2);
    g.stroke();

    // Sheets of light chasing round the veil.
    for (let i = 0; i < 3; i++) {
      const head = t * (i % 2 ? -1.6 : 2.2) + (i * Math.PI * 2) / 3;

      g.globalAlpha = 0.85;
      g.strokeStyle = "#fffbe8";
      g.lineWidth = 1.4 * s;
      g.beginPath();
      g.arc(cx, cy, R + (i - 1) * 1.5 * s, head, head + 1.1);
      g.stroke();
    }

    // Now and then an arrow glances off the veil and drops away.
    const n = Math.floor(t / VOLLEY_S);

    const u = t - n * VOLLEY_S;

    const side = n % 2 ? 1 : -1;

    const hitA = side > 0 ? -0.5 : Math.PI + 0.5;

    const hit = { x: cx + Math.cos(hitA) * R, y: cy + Math.sin(hitA) * R };

    let x: number, y: number, rot: number, alpha: number;

    if (u < FLY_S) {
      const k = u / FLY_S;

      x = hit.x + side * (1 - k) * r * 1.2;
      y = hit.y - (1 - k) * r * 0.4;
      rot = Math.atan2(r * 0.4, -side * r * 1.2);
      alpha = clamp01(k * 4);
    } else {
      const a = u - FLY_S;

      x = hit.x + side * a * 40 * s;
      y = hit.y - a * 50 * s + a * a * 260 * s;
      rot = Math.atan2(r * 0.4, -side * r * 1.2) + side * a * 9;
      alpha = clamp01(1 - (a - 0.4) / 0.3);
    }

    if (u >= FLY_S && u < FLY_S + 0.3) {
      g.globalAlpha = 1 - (u - FLY_S) / 0.3;
      g.strokeStyle = "#ffffff";
      g.lineWidth = 2.2 * s;
      g.beginPath();
      g.arc(cx, cy, R, hitA - 0.45, hitA + 0.45);
      g.stroke();
    }

    if (alpha > 0) {
      g.save();
      g.translate(x, y);
      g.rotate(rot);
      g.globalAlpha = alpha;
      g.globalCompositeOperation = "source-over";
      arrow(g, r * 0.75);
      g.restore();
    }

    g.globalAlpha = 1;
  },
};
