import { rand } from "../../runtime/geometry";
import type { AuraParticle } from "../../runtime/particles";
import { cloudPath } from "../../runtime/shapes";
import { glow, spritePx } from "../../runtime/texture";
import { centredSprite, drawCentred } from "./kit";
import type { AuraAnimation } from "./types";

function drawDrop(g: CanvasRenderingContext2D, p: AuraParticle) {
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = 0.7;
  g.strokeStyle = "#d8e4f4";
  g.lineWidth = p.size1;
  g.beginPath();
  g.moveTo(p.x + p.size0 * 0.2, p.y - p.size0);
  g.lineTo(p.x, p.y);
  g.stroke();
}

function fall(p: AuraParticle<number>, dt: number) {
  p.y += p.vy * dt;
  p.x -= p.vy * dt * 0.2;

  if (p.y > p.data) p.age = p.life;
}

export const raincloudAura: AuraAnimation = {
  frame(g, ctx, t, dt) {
    const { cx, cy, r, s, parts } = ctx;

    const w = r * 1.55;

    const x = cx + Math.sin(t * 0.7) * r * 0.08;

    const y = cy - r * 1.7;

    spritePx(g, glow("#4a5668"), x, y, w * 1.6, w * 0.9, 0.55, false);

    const sprite = centredSprite(ctx, "cloud", w * 0.75, (lg) => {
      const shade = lg.createLinearGradient(0, -w * 0.3, 0, w * 0.25);

      shade.addColorStop(0, "#8a92a0");
      shade.addColorStop(0.55, "#4a525e");
      shade.addColorStop(1, "#262c36");
      cloudPath(lg, 0, -s, w);
      lg.fillStyle = "#a8b2c0";
      lg.fill();
      cloudPath(lg, 0, 0, w);
      lg.fillStyle = shade;
      lg.fill();
    });

    parts.emit(18, dt, () => {
      const dx = rand(-w * 0.32, w * 0.32);

      // Drops that would land on the face stop at the rim, the rest fall past it.
      const land = Math.abs(dx) < r * 0.9 ? cy - Math.sqrt(Math.max(0, r * r - dx * dx)) * 0.9 : cy + r * 1.6;

      return { x: x + dx, y: y + w * 0.12, vy: rand(70, 95) * s, life: 2, size0: rand(4, 6) * s, size1: 1.1 * s, data: land, move: fall, draw: drawDrop };
    });
    parts.step(g, dt);
    drawCentred(g, ctx, sprite, x, y);
  },
};
