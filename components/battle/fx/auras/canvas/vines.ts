import { rand } from "../../runtime/geometry";
import type { AuraParticle } from "../../runtime/particles";
import { dropPath } from "../../runtime/shapes";
import { glow, spritePx } from "../../runtime/texture";
import { drawLayer, onRim, staticLayer } from "./kit";
import type { AuraAnimation, AuraCtx } from "./types";

// Thorn angles round the rim (radians from 3 o'clock); sap drips from the lower ones.
const THORNS = [0.2, 0.75, 1.3, 1.85, 2.4, 2.95, 3.5, 4.1, 4.7, 5.3, 5.85];

const DRIPS = THORNS.filter((a) => Math.sin(a) > 0.2);

// Two dark shoots coiling round the portrait, crossing over and under the rim, with black thorns.
function paintVines(g: CanvasRenderingContext2D, ctx: AuraCtx) {
  const { cx, cy, r, s } = ctx;

  g.lineCap = "round";

  for (const [phase, wobble] of [[0, 0.16], [Math.PI, 0.12]] as const) {
    for (const [width, color] of [[4.4, "#0c1a06"], [2.8, "#3c6a1e"], [0.9, "#6a9a3a"]] as const) {
      g.strokeStyle = color;
      g.lineWidth = width * s;
      g.beginPath();

      for (let a = 0; a <= Math.PI * 2 + 0.05; a += 0.08) {
        const d = r * (1.08 + Math.sin(a * 4 + phase) * wobble);

        g.lineTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d);
      }

      g.stroke();
    }
  }

  g.fillStyle = "#101a08";

  for (const a of THORNS) {
    const base = onRim(ctx, a, 1.12);

    const tip = onRim(ctx, a + 0.08, 1.42);

    const nx = -Math.sin(a) * 1.8 * s;

    const ny = Math.cos(a) * 1.8 * s;

    g.beginPath();
    g.moveTo(base.x - nx, base.y - ny);
    g.lineTo(tip.x, tip.y);
    g.lineTo(base.x + nx, base.y + ny);
    g.closePath();
    g.fill();
  }
}

function drawSap(g: CanvasRenderingContext2D, p: AuraParticle, k: number) {
  const size = p.size0 * Math.min(1, k * 4);

  spritePx(g, glow("#d8c020"), p.x, p.y, size * 4, undefined, 0.3 * (1 - k));
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = Math.min(1, (1 - k) * 4);
  g.fillStyle = "#e8d030";
  dropPath(g, p.x, p.y, size, 2.2);
  g.fill();
  g.fillStyle = "rgba(255,250,200,0.9)";
  g.beginPath();
  g.arc(p.x - size * 0.3, p.y - size * 0.1, size * 0.25, 0, Math.PI * 2);
  g.fill();
}

// A bead swells at the thorn, then lets go and falls.
function drip(p: AuraParticle, dt: number) {
  if (p.age > p.life * 0.45) {
    p.vy += 240 * dt;
    p.y += p.vy * dt;
  }
}

export const vinesAura: AuraAnimation = {
  frame(g, ctx, t, dt) {
    const { cx, cy, r, s, parts } = ctx;

    const squeeze = Math.max(0, Math.sin(t * 2.4)) ** 6;

    spritePx(g, glow("#3a5a10"), cx, cy, r * (3.2 + squeeze * 0.3), undefined, 0.35 + squeeze * 0.25);
    drawLayer(g, staticLayer(ctx, "vines", (lg) => paintVines(lg, ctx)));

    parts.emit(1.6, dt, () => {
      const at = onRim(ctx, DRIPS[Math.floor(rand(0, DRIPS.length))] + 0.05, 1.32);

      return { x: at.x, y: at.y, life: rand(1, 1.4), size0: rand(1.6, 2.2) * s, move: drip, draw: drawSap };
    });
    parts.step(g, dt);
    g.globalAlpha = 1;
  },
};
