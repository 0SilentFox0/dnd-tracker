import { easeOutCubic } from "../../runtime/easing";
import { rand } from "../../runtime/geometry";
import type { AuraParticle } from "../../runtime/particles";
import { plusSign } from "../../runtime/shapes";
import { glow, spritePx } from "../../runtime/texture";
import { drawLayer, outside, staticLayer } from "./kit";
import type { AuraAnimation, AuraCtx } from "./types";

const BEAT_S = 2.4;

const DOME = 1.45;

function drawPlus(g: CanvasRenderingContext2D, p: AuraParticle, k: number) {
  const a = Math.min(1, k * 5, (1 - k) * 2.5);

  spritePx(g, glow("#6fe07a"), p.x, p.y, p.size0 * 2.4, undefined, a * 0.7);
  g.globalCompositeOperation = "lighter";
  g.globalAlpha = a;
  plusSign(g, p.x, p.y, p.size0, "#e8ffe0");
}

// Heartbeat, `sec` into the cycle: a strong beat, then a weaker one.
function beat(sec: number) {
  const lub = sec < 0.4 ? 1 - sec / 0.4 : 0;

  const dub = sec > 0.17 && sec < 0.47 ? 0.6 * (1 - (sec - 0.17) / 0.3) : 0;

  return Math.max(lub, dub);
}

// The beat only scales the stop alphas, and "lighter" adds up, so a resting layer plus a beat layer at alpha b equals the live gradient.
function domeFill(g: CanvasRenderingContext2D, ctx: AuraCtx, inner: number, rim: number) {
  const { cx, cy, r } = ctx;

  const R = r * DOME;

  outside(g, ctx, () => {
    const fill = g.createRadialGradient(cx, cy, r, cx, cy, R);

    fill.addColorStop(0, `rgba(90,220,120,${inner})`);
    fill.addColorStop(1, `rgba(150,255,170,${rim})`);
    g.fillStyle = fill;
    g.beginPath();
    g.arc(cx, cy, R, 0, Math.PI * 2);
    g.fill();
  }, DOME + 0.2);
}

export const lifedomeAura: AuraAnimation = {
  frame(g, ctx, t, dt) {
    const { cx, cy, r, s, parts } = ctx;

    const sec = t % BEAT_S;

    const b = beat(sec);

    const R = r * DOME;

    drawLayer(g, staticLayer(ctx, "dome", (lg) => domeFill(lg, ctx, 0.12, 0.45)), 1, "lighter");

    if (b > 0) drawLayer(g, staticLayer(ctx, "beat", (lg) => domeFill(lg, ctx, 0.18, 0.35)), b, "lighter");

    outside(g, ctx, () => {
      g.globalCompositeOperation = "lighter";
      g.strokeStyle = "rgba(170,255,180,0.3)";
      g.lineWidth = Math.max(0.8, s);
      g.beginPath();
      g.ellipse(cx, cy, R * 0.55, R, 0, Math.PI, Math.PI * 2);
      g.stroke();

      const wave = sec / 0.9;

      if (wave < 1) {
        g.globalAlpha = 1 - wave;
        g.strokeStyle = "#d8ffd0";
        g.lineWidth = 2 * s;
        g.beginPath();
        g.arc(cx, cy, r + (R - r) * easeOutCubic(wave) + 1, 0, Math.PI * 2);
        g.stroke();
        g.globalAlpha = 1;
      }
    }, DOME + 0.2);

    g.globalCompositeOperation = "lighter";
    g.strokeStyle = "#b8ffc0";
    g.lineWidth = (1.6 + b * 2) * s;
    g.globalAlpha = 0.75 + b * 0.25;
    g.beginPath();
    g.arc(cx, cy, R, 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = "rgba(255,255,255,0.75)";
    g.lineWidth = 1.8 * s;
    g.lineCap = "round";
    g.beginPath();
    g.arc(cx, cy, R - 2.5 * s, Math.PI * 1.1, Math.PI * 1.4);
    g.stroke();
    g.globalAlpha = 1;

    if (sec < dt) {
      for (let n = 0; n < 2; n++) parts.spawn({ x: cx + rand(-r, r), y: cy + r * rand(0.2, 0.8), vy: -rand(16, 24) * s, life: rand(1, 1.3), size0: rand(7, 9) * s, draw: drawPlus });
    }

    parts.step(g, dt);
  },
};
