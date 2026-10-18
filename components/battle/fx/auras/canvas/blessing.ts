import { rand } from "../../runtime/geometry";
import { glow, spritePx } from "../../runtime/texture";
import { twinkleDraw } from "./kit";
import type { AuraAnimation } from "./types";

const sparkle = twinkleDraw("#fff1b0");

function halo(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, from: number, to: number) {
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, from, to);
  g.stroke();
}

export const blessingAura: AuraAnimation = {
  frame(g, ctx, t, dt) {
    const { cx, cy, r, s, parts } = ctx;

    const hy = cy - r * 1.12 + Math.sin(t * 2.2) * 2 * s;

    const rx = r * 0.62;

    const ry = r * 0.2;

    const shine = 0.85 + Math.sin(t * 3.1) * 0.15;

    spritePx(g, glow("#ffc93a"), cx, hy, rx * 3.2, ry * 5, 0.7 * shine);
    spritePx(g, glow("#ffe9a0"), cx, cy, r * 2.7, undefined, 0.18);

    g.globalCompositeOperation = "lighter";
    g.lineCap = "round";
    g.globalAlpha = 0.5 * shine;
    g.strokeStyle = "#ffb726";
    g.lineWidth = 4.5 * s;
    halo(g, cx, hy, rx, ry, 0, Math.PI * 2);
    g.globalAlpha = shine;
    g.strokeStyle = "#fff4c2";
    g.lineWidth = 1.8 * s;
    halo(g, cx, hy, rx, ry, 0, Math.PI * 2);

    parts.emit(5, dt, () => {
      const a = rand(0, Math.PI * 2);

      return { x: cx + Math.cos(a) * rx, y: hy + Math.sin(a) * ry, vy: rand(6, 14) * s, life: rand(0.6, 1.1), size0: rand(3, 4.5) * s, draw: sparkle };
    });
    parts.step(g, dt);
  },
};
