import { glow, sprite } from "../../runtime/texture";
import { type AuraAnimation } from "./types";

function leaf(g: CanvasRenderingContext2D, x: number, y: number, len: number) {
  g.beginPath();
  g.moveTo(x, y + len / 2);
  g.quadraticCurveTo(x - len * 0.55, y, x, y - len / 2);
  g.quadraticCurveTo(x + len * 0.55, y, x, y + len / 2);
  g.closePath();
}

export const markedAura: AuraAnimation = {
  frame(g, ctx, t) {
    const { cx, cy, r, s } = ctx;

    const pulse = 0.5 + Math.sin(t * 3.2) * 0.5;

    const ly = cy - r * 1.32;

    const len = r * (0.78 + pulse * 0.08);

    sprite(g, glow("#2fe08a"), cx, ly, (r * (1.6 + pulse * 0.5)) / 64, undefined, 0.55 + pulse * 0.35);

    g.save();
    g.translate(cx, ly);
    g.rotate(Math.PI / 4);
    g.globalCompositeOperation = "source-over";
    g.fillStyle = "#0f8a52";
    leaf(g, 0, 0, len);
    g.fill();
    g.globalCompositeOperation = "lighter";
    g.globalAlpha = 0.6 + pulse * 0.4;
    g.fillStyle = "#3dffa0";
    leaf(g, 0, 0, len * 0.82);
    g.fill();
    g.globalAlpha = 1;
    g.strokeStyle = "#e6fff2";
    g.lineWidth = 1 * s;
    g.beginPath();
    g.moveTo(0, len * 0.45);
    g.lineTo(0, -len * 0.38);
    g.stroke();
    g.restore();

    // Reticle ticks: the target is marked for the hunter.
    const spin = t * 0.6;

    g.globalCompositeOperation = "lighter";
    g.strokeStyle = `rgba(80,240,160,${0.55 + pulse * 0.35})`;
    g.lineWidth = 1.8 * s;
    g.lineCap = "round";
    g.beginPath();

    for (let i = 0; i < 4; i++) {
      const a = spin + (i * Math.PI) / 2;

      g.moveTo(cx + Math.cos(a) * r * 1.08, cy + Math.sin(a) * r * 1.08);
      g.lineTo(cx + Math.cos(a) * r * 1.3, cy + Math.sin(a) * r * 1.3);
    }

    g.stroke();
    g.lineWidth = 1 * s;
    g.strokeStyle = `rgba(80,240,160,${0.25 + pulse * 0.2})`;
    g.beginPath();
    g.arc(cx, cy, r * 1.12, 0, Math.PI * 2);
    g.stroke();
  },
};
