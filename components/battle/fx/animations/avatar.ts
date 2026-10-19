import { clamp01, envelope } from "../runtime/easing";
import { summonSpot } from "../runtime/figure";
import { type FxPoint, rand } from "../runtime/geometry";
import { emit, flash, ring } from "../runtime/primitives";
import { perTarget } from "../runtime/recipes";
import { schedule, show, tween } from "../runtime/stage";
import { glow, spritePx } from "../runtime/texture";
import type { FxAnimation } from "./types";

import { IMPACT_MS } from "@/lib/utils/battle/fx";

const FORM_MS = IMPACT_MS.avatar;

const TOTAL_MS = 2700;

const SMOKE = ["#1a0a26", "#2a1238", "#140a1c"];

const VIOLET = ["#f3d0ff", "#b04dff", "#8a2be2"];

// A hooded robe `h` tall, feet at the origin; `warp` lets its edges drift like smoke.
function robePath(g: CanvasRenderingContext2D, h: number, warp: (p: FxPoint, i: number) => FxPoint) {
  const right: [number, number][] = [
    [0, -1],
    [0.09, -0.97],
    [0.13, -0.86],
    [0.25, -0.74],
    [0.31, -0.5],
    [0.3, -0.38],
    [0.24, -0.4],
    [0.26, -0.2],
    [0.34, 0],
  ];

  const pts = right.map(([x, y]) => ({ x: x * h, y: y * h }));

  const hem = Array.from({ length: 7 }, (_, n) => ({ x: (0.34 - (n + 1) * (0.68 / 8)) * h, y: (n % 2 ? -0.05 : 0.01) * h }));

  const left = [...pts].reverse().slice(0, -1).map((p) => ({ x: -p.x, y: p.y }));

  const outline = [...pts, ...hem, ...left].map(warp);

  g.beginPath();
  outline.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
  g.closePath();
}

export const avatar: FxAnimation = ({ stage, to, targetEls }) =>
  perTarget(stage, to, 0, async (target, i) => {
    const spot = summonSpot(targetEls[i], target);

    const { x, ground } = spot;

    const H = Math.min(spot.height * 1.12, ground - 6);

    const centre = { x, y: ground - H * 0.5 };

    let t = 0;

    const hide = show(stage, (g) => {
      const time = t / 1000;

      // The air thickens and shimmers as over hot stone.
      const haze = envelope(clamp01(t / (FORM_MS + 300)), 0.3, 0.3);

      if (haze > 0) {
        g.globalCompositeOperation = "source-over";
        spritePx(g, glow("#140a1c"), x, centre.y, H * 1.1, H * 1.4, 0.6 * haze, false);
        g.globalCompositeOperation = "lighter";
        g.lineWidth = 1;

        for (let n = 0; n < 6; n++) {
          const lx = x + (n - 2.5) * H * 0.09;

          g.globalAlpha = haze * 0.35;
          g.strokeStyle = n % 2 ? "#e6d0ff" : "#b07cff";
          g.beginPath();

          for (let y = ground; y > ground - H; y -= 4) g.lineTo(lx + Math.sin(y * 0.18 - time * 9 + n) * 2.5, y);

          g.stroke();
        }
      }

      const body = clamp01((t - FORM_MS + 250) / 550) * (1 - clamp01((t - TOTAL_MS + 500) / 500));

      if (body <= 0) return;

      const breath = 1 + Math.sin(time * 3.2) * 0.012;

      g.save();
      g.translate(x, ground);
      g.scale(breath, breath);

      // Violet-white light behind it, rays slowly turning.
      g.globalCompositeOperation = "lighter";
      spritePx(g, glow("#8a2be2"), 0, -H * 0.62, H * 1.4, H * 1.5, 0.55 * body);

      for (let n = 0; n < 9; n++) {
        const a = -Math.PI / 2 + (n - 4) * 0.28 + Math.sin(time * 0.8) * 0.06;

        const len = H * (0.55 + (n % 2) * 0.15);

        const grad = g.createLinearGradient(0, -H * 0.75, Math.cos(a) * len, -H * 0.75 + Math.sin(a) * len);

        grad.addColorStop(0, `rgba(230,200,255,${0.5 * body})`);
        grad.addColorStop(1, "rgba(160,80,255,0)");
        g.strokeStyle = grad;
        g.lineWidth = H * 0.05;
        g.globalAlpha = 1;
        g.beginPath();
        g.moveTo(0, -H * 0.75);
        g.lineTo(Math.cos(a) * len, -H * 0.75 + Math.sin(a) * len);
        g.stroke();
      }

      const drift = (p: FxPoint, n: number) => ({ x: p.x + Math.sin(time * 2.5 + n * 1.1) * H * 0.012 * (1 + p.y / H + 0.5), y: p.y });

      // The figure itself: shadow given shape, rimmed with violet light.
      const fill = g.createLinearGradient(0, 0, 0, -H);

      fill.addColorStop(0, "rgba(20,8,30,0.55)");
      fill.addColorStop(0.3, "rgba(18,6,28,0.95)");
      fill.addColorStop(1, "rgba(30,12,46,0.98)");
      g.globalCompositeOperation = "source-over";
      g.globalAlpha = body;
      g.shadowColor = "#a050ff";
      g.shadowBlur = 10;
      g.fillStyle = fill;
      robePath(g, H, drift);
      g.fill();
      g.shadowBlur = 0;
      g.strokeStyle = "rgba(200,150,255,0.85)";
      g.lineWidth = 1.3;
      g.stroke();

      // No face: only the void under the hood, a faint violet glow deep inside.
      g.fillStyle = "#020004";
      g.beginPath();
      g.ellipse(0, -H * 0.86, H * 0.065, H * 0.085, 0, 0, Math.PI * 2);
      g.fill();
      spritePx(g, glow("#6a1fd0"), 0, -H * 0.85, H * 0.12, undefined, 0.6 * body);

      // A seam of light down the robe.
      g.globalCompositeOperation = "lighter";
      g.strokeStyle = `rgba(220,180,255,${0.5 * body})`;
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(0, -H * 0.74);
      g.lineTo(Math.sin(time * 2) * 1.5, -H * 0.04);
      g.stroke();
      g.restore();
      g.globalAlpha = 1;
    });

    // Dark smoke and violet light are drawn in from all round and coalesce.
    const gather = (tints: string[], additive: boolean, alpha: number, scale: [number, number]) => {
      const a = rand(0, Math.PI * 2);

      const r = rand(H * 0.6, H * 0.95);

      const life = rand(0.45, 0.7);

      const from = { x: centre.x + Math.cos(a) * r, y: centre.y + Math.sin(a) * r * 0.8 };

      const angle = Math.atan2(centre.y - from.y, centre.x - from.x);

      emit(stage, from, { tints, speed: [(r * 0.85) / life, (r * 0.95) / life], angle: [angle, angle], life: [life, life], scale, additive, alpha });
    };

    schedule(stage, FORM_MS, () => {
      void flash(stage, centre, "#c27aff", H * 1.6, 500);
      void ring(stage, { x, y: ground }, "#b04dff", 750, H * 0.7, 3, 0.25);
    });

    await tween(stage, TOTAL_MS, (k) => {
      t = k * TOTAL_MS;

      if (t > 150 && t < FORM_MS + 100) {
        gather(SMOKE, false, 0.7, [1.1, 0.4]);

        if (Math.random() < 0.6) gather(["#d8a8ff", "#b04dff", "#8a2be2"], true, 1, [0.22, 0.06]);
      }

      // Smoke curling off the hem, and the figure finally dissolving back into it.
      if (t > FORM_MS && Math.random() < (t > TOTAL_MS - 500 ? 1 : 0.4)) {
        const top = t > TOTAL_MS - 500 ? H : H * 0.15;

        emit(stage, { x: x + rand(-H * 0.28, H * 0.28), y: ground - rand(0, top) }, { tints: SMOKE, speed: [8, 25], angle: [-Math.PI * 0.8, -Math.PI * 0.2], life: [0.7, 1.1], scale: [0.5, 1], drag: 1, additive: false, alpha: 0.5, gravity: -15 });
      }

      if (t > FORM_MS && t < TOTAL_MS - 400 && Math.random() < 0.25) emit(stage, { x: x + rand(-H * 0.3, H * 0.3), y: ground - rand(0, H) }, { tints: VIOLET, speed: [8, 20], angle: [-Math.PI * 0.7, -Math.PI * 0.3], life: [0.6, 1], scale: [0.18, 0.04], gravity: -20 });
    }).then(() => void hide());
  });
