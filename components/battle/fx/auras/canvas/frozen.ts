import { fadeInOut } from "../../runtime/easing";
import { rand } from "../../runtime/geometry";
import type { AuraParticle } from "../../runtime/particles";
import { twinkle } from "../../runtime/shapes";
import { glow, spritePx } from "../../runtime/texture";
import { twinkleDraw } from "./kit";
import type { AuraAnimation } from "./types";

// [angle, radius × r] of the ice block outline, clockwise from the top.
const SHELL: [number, number][] = [[-1.62, 1.3], [-0.95, 1.22], [-0.3, 1.3], [0.42, 1.2], [1.05, 1.28], [1.7, 1.24], [2.35, 1.3], [2.95, 1.2], [3.6, 1.28], [4.15, 1.22]];

// Inner facet ridge: each outer vertex joins the nearest of these.
const CORE: [number, number][] = [[-1.2, 0.62], [0.25, 0.7], [1.6, 0.6], [2.9, 0.68], [4.0, 0.58]];

const MIST = ["#cfeaff", "#a9d6f2"];

const sparkle = twinkleDraw("#ffffff");

function pt(cx: number, cy: number, r: number, [a, d]: [number, number]) {
  return { x: cx + Math.cos(a) * r * d, y: cy + Math.sin(a) * r * d };
}

function nearestCore(a: number) {
  let best = 0;

  let gap = Infinity;

  CORE.forEach(([ca], i) => {
    const d = Math.abs(Math.atan2(Math.sin(a - ca), Math.cos(a - ca)));

    if (d < gap) [best, gap] = [i, d];
  });

  return best;
}

const LINKS = SHELL.map(([a]) => nearestCore(a));

function drawMist(g: CanvasRenderingContext2D, p: AuraParticle, k: number) {
  spritePx(g, glow(p.tint), p.x, p.y, p.size0 * (1 + k * 0.6), p.size0 * 0.55, p.alpha * fadeInOut(k, 0.35), false);
}

export const frozenAura: AuraAnimation = {
  frame(g, ctx, t, dt) {
    const { cx, cy, r, s, parts } = ctx;

    const outer = SHELL.map((v) => pt(cx, cy, r, v));

    const inner = CORE.map((v) => pt(cx, cy, r, v));

    parts.emit(5, dt, () => ({ x: cx + rand(-r * 1.2, r * 1.2), y: cy + r * rand(1.05, 1.25), vx: rand(-6, 6) * s, vy: -rand(1, 4) * s, life: rand(1.6, 2.6), size0: rand(16, 24) * s, tint: MIST[Math.random() < 0.5 ? 0 : 1], alpha: 0.32, draw: drawMist }));

    g.globalCompositeOperation = "source-over";

    const body = g.createLinearGradient(cx - r, cy - r * 1.3, cx + r, cy + r * 1.3);

    body.addColorStop(0, "rgba(225,245,255,0.42)");
    body.addColorStop(0.5, "rgba(150,205,240,0.22)");
    body.addColorStop(1, "rgba(90,160,220,0.4)");
    g.fillStyle = body;
    g.beginPath();

    for (const p of outer) g.lineTo(p.x, p.y);

    g.closePath();
    g.fill();

    // Alternate facets catch the light differently, which sells the cut-ice look.
    outer.forEach((p, i) => {
      const q = outer[(i + 1) % outer.length];

      const c = inner[LINKS[i]];

      const c2 = inner[LINKS[(i + 1) % outer.length]];

      g.beginPath();
      g.moveTo(p.x, p.y);
      g.lineTo(q.x, q.y);
      g.lineTo(c2.x, c2.y);

      if (c2 !== c) g.lineTo(c.x, c.y);

      g.closePath();
      g.fillStyle = i % 3 === 0 ? "rgba(255,255,255,0.22)" : i % 3 === 1 ? "rgba(120,190,240,0.18)" : "rgba(200,235,255,0.08)";
      g.fill();
    });

    g.lineJoin = "round";
    g.lineWidth = 0.9 * s;
    g.strokeStyle = "rgba(235,250,255,0.65)";
    g.beginPath();
    outer.forEach((p, i) => {
      const c = inner[LINKS[i]];

      g.moveTo(p.x, p.y);
      g.lineTo(c.x, c.y);
    });
    inner.forEach((p, i) => {
      const q = inner[(i + 1) % inner.length];

      g.moveTo(p.x, p.y);
      g.lineTo(q.x, q.y);
    });
    g.stroke();

    g.lineWidth = 1.6 * s;
    g.strokeStyle = "rgba(240,252,255,0.95)";
    g.shadowColor = "#9fdcff";
    g.shadowBlur = 6 * s;
    g.beginPath();

    for (const p of outer) g.lineTo(p.x, p.y);

    g.closePath();
    g.stroke();
    g.shadowBlur = 0;

    const sweep = ((t * 0.35) % 1) * 3 - 1;

    if (sweep > -0.6 && sweep < 1.6) {
      g.save();
      g.beginPath();

      for (const p of outer) g.lineTo(p.x, p.y);

      g.closePath();
      g.clip();

      const x = cx - r * 1.4 + sweep * r * 1.6;

      const band = g.createLinearGradient(x - r * 0.35, 0, x + r * 0.35, 0);

      band.addColorStop(0, "rgba(255,255,255,0)");
      band.addColorStop(0.5, "rgba(255,255,255,0.5)");
      band.addColorStop(1, "rgba(255,255,255,0)");
      g.translate(x, cy);
      g.rotate(0.5);
      g.translate(-x, -cy);
      g.fillStyle = band;
      g.fillRect(x - r * 0.35, cy - r * 2, r * 0.7, r * 4);
      g.restore();
    }

    for (const i of [0, 3, 6]) {
      const p = outer[i];

      twinkle(g, p.x, p.y, (3 + Math.sin(t * 2.4 + i) * 1.5) * s, "#ffffff", 0.7 + Math.sin(t * 2.4 + i) * 0.3);
    }

    g.globalAlpha = 1;
    parts.emit(3, dt, () => {
      const a = rand(0, Math.PI * 2);

      const d = rand(0.3, 1.25);

      return { x: cx + Math.cos(a) * r * d, y: cy + Math.sin(a) * r * d, life: rand(0.7, 1.2), size0: rand(2.5, 4) * s, draw: sparkle };
    });
    parts.step(g, dt);
  },
};
