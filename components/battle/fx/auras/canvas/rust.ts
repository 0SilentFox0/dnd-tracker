import { fadeInOut } from "../../runtime/easing";
import { pick, rand } from "../../runtime/geometry";
import type { AuraParticle } from "../../runtime/particles";
import { drawRustPatch, rustPatch } from "../../runtime/shapes";
import { glow, spritePx } from "../../runtime/texture";
import { drawLayer, onRim, outside, staticLayer } from "./kit";
import type { AuraAnimation, AuraCtx } from "./types";

const FLAKES = ["#8a3e12", "#a8521c", "#5a2a0e", "#c0682a"];

function drawFlake(g: CanvasRenderingContext2D, p: AuraParticle, k: number) {
  g.save();
  g.translate(p.x, p.y);
  g.rotate(p.phase + p.age * 5);
  g.scale(1, Math.cos(p.age * 7 + p.phase));
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = fadeInOut(k, 0.15);
  g.fillStyle = p.tint;
  g.fillRect(-p.size0 / 2, -p.size0 / 3, p.size0, p.size0 * 0.66);
  g.restore();
}

// Rust eating into the frame round the portrait: blots on the rim and hairline cracks, painted once.
function paintRust(g: CanvasRenderingContext2D, ctx: AuraCtx) {
  const { r, s } = ctx;

  outside(g, ctx, () => {
    for (const [a, size] of [[2.3, 0.34], [2.9, 0.26], [0.9, 0.3], [0.3, 0.22], [-0.6, 0.2], [3.7, 0.24], [1.6, 0.28]] as const) {
      const p = onRim(ctx, a, 1.08);

      spritePx(g, glow("#7a3410"), p.x, p.y, r * size * 2.6, undefined, 0.75, false);
      g.save();
      g.translate(p.x, p.y);
      drawRustPatch(g, rustPatch(r * size), 1.1 * s);
      g.restore();
    }
  });

  g.lineCap = "round";

  for (const a of [2.6, 0.6, -1.2]) {
    let p = onRim(ctx, a, 0.98);

    let dir = a + Math.PI + rand(-0.5, 0.5);

    g.beginPath();
    g.moveTo(p.x, p.y);

    for (let n = 0; n < 4; n++) {
      dir += rand(-0.6, 0.6);
      p = { x: p.x + Math.cos(dir) * r * 0.13, y: p.y + Math.sin(dir) * r * 0.13 };
      g.lineTo(p.x, p.y);
    }

    g.strokeStyle = "rgba(10,6,4,0.7)";
    g.lineWidth = 1.8 * s;
    g.stroke();
    g.strokeStyle = "rgba(226,214,196,0.55)";
    g.lineWidth = 0.7 * s;
    g.stroke();
  }

  g.globalAlpha = 1;
}

export const rustAura: AuraAnimation = {
  frame(g, ctx, t, dt) {
    const { cx, cy, r, s, parts } = ctx;

    const smoulder = 0.25 + Math.sin(t * 1.6) * 0.1;

    outside(g, ctx, () => spritePx(g, glow("#c0682a"), cx, cy + r * 0.4, r * 3, r * 2.4, smoulder));
    drawLayer(g, staticLayer(ctx, "rust", (lg) => paintRust(lg, ctx)));

    parts.emit(3, dt, () => {
      const p = onRim(ctx, rand(0.2, Math.PI - 0.2), 1.05);

      return { x: p.x, y: p.y, vx: rand(-6, 6) * s, vy: rand(6, 14) * s, life: rand(1.2, 1.8), size0: rand(2.5, 4) * s, tint: pick(FLAKES), draw: drawFlake };
    });
    parts.step(g, dt);
  },
};
