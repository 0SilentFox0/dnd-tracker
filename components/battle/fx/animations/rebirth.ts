import { faceOf, halfSize } from "../runtime/anchors";
import { clamp01, easeOutCubic } from "../runtime/easing";
import { chance, cubicBezier, type FxPoint, pick, rand } from "../runtime/geometry";
import { emit, shoot } from "../runtime/primitives";
import { perTarget } from "../runtime/recipes";
import { leafPath, taperedStroke } from "../runtime/shapes";
import { animateEl, schedule, timeline } from "../runtime/stage";
import type { FxAnimation } from "./types";

import { ARCHETYPE_FX } from "@/lib/utils/battle/fx";

const SEED_MS = 300;

const BLOOM_MS = 850;

const RISE_MS = ARCHETYPE_FX.rebirth.impactMs;

const TOTAL_MS = 2700;

const BLOSSOM = ["#ffffff", "#ffd0e4", "#ffb0d0", "#fff0b0"];

const MOTES = ["#e8ffd8", "#9ff0a0", "#5fd27a"];

const RISE: Keyframe[] = [
  { transform: "none", filter: "none" },
  { transform: "translateY(-4px)", filter: "brightness(1.35) saturate(1.2)", offset: 0.35 },
  { transform: "none", filter: "none" },
];

interface Stem {
  pts: [FxPoint, FxPoint, FxPoint, FxPoint];
  born: number;
  blossoms: FxPoint[];
}

interface Petal extends FxPoint {
  vx: number;
  vy: number;
  rot: number;
  spin: number;
  color: string;
  born: number;
}

function leaf(g: CanvasRenderingContext2D, at: FxPoint, angle: number, size: number) {
  g.save();
  g.translate(at.x, at.y);
  g.rotate(angle);
  leafPath(g, 0, size, size * 0.42);
  g.fillStyle = "#5cb040";
  g.fill();
  g.strokeStyle = "#1e4a14";
  g.lineWidth = 0.7;
  g.stroke();
  g.restore();
}

function blossom(g: CanvasRenderingContext2D, at: FxPoint, size: number, color: string) {
  g.fillStyle = color;

  for (let n = 0; n < 5; n++) {
    const a = (n / 5) * Math.PI * 2;

    g.beginPath();
    g.arc(at.x + Math.cos(a) * size * 0.5, at.y + Math.sin(a) * size * 0.5, size * 0.42, 0, Math.PI * 2);
    g.fill();
  }

  g.fillStyle = "#f2b400";
  g.beginPath();
  g.arc(at.x, at.y, size * 0.3, 0, Math.PI * 2);
  g.fill();
}

export const rebirth: FxAnimation = ({ stage, from, to, targetEls }) =>
  perTarget(stage, to, ARCHETYPE_FX.rebirth.staggerMs, async (target, i) => {
    const el = targetEls[i];

    const { w, h } = halfSize(el);

    const ground = target.y + h;

    const face = faceOf(el, target);

    const n = Math.max(3, Math.min(6, Math.round(w / 22)));

    const stems: Stem[] = Array.from({ length: n }, (_, k) => {
      const x = target.x - w * 0.85 + ((k + 0.5) / n) * w * 1.7 + rand(-4, 4);

      const tall = h * rand(1.3, 1.9);

      const lean = rand(-10, 10);

      const pts: Stem["pts"] = [
        { x, y: ground },
        { x: x + lean * 0.3, y: ground - tall * 0.35 },
        { x: x + lean, y: ground - tall * 0.7 },
        { x: x + lean * 0.6, y: ground - tall },
      ];

      return { pts, born: SEED_MS + k * 60, blossoms: [pts[3], cubicBezier(pts, 0.7), { x: pts[3].x + rand(-8, 8), y: pts[3].y + rand(4, 10) }] };
    });

    const petals: Petal[] = [];

    const colors = stems.map(() => pick(BLOSSOM));

    const run = timeline(
      stage,
      TOTAL_MS,
      (g, t) => {
        const wither = clamp01((t - RISE_MS - 250) / 600);

        g.globalCompositeOperation = "source-over";

        for (const [k, s] of stems.entries()) {
          const grow = easeOutCubic(clamp01((t - s.born) / 520)) * (1 - wither);

          if (grow <= 0) continue;

          const steps = Math.max(2, Math.round(16 * grow));

          const line = Array.from({ length: steps + 1 }, (_, j) => cubicBezier(s.pts, (j / steps) * grow));

          g.globalAlpha = 1;
          taperedStroke(g, line, "#1e4a14", 4.4, 0.6, 1.2, 16);
          taperedStroke(g, line, "#5ca03a", 2.8, 0.6, 0.8, 16);

          for (const at of [0.35, 0.55, 0.75]) {
            if (at > grow) continue;

            const p = cubicBezier(s.pts, at);

            const open = clamp01((grow - at) / 0.25);

            leaf(g, p, (at * 10 + k) % 2 ? -0.5 : Math.PI + 0.5, 9 * open);
          }

          // The bush flowers.
          const bloom = easeOutCubic(clamp01((t - BLOOM_MS - k * 50) / 280)) * (1 - wither);

          if (bloom > 0) {
            s.blossoms.forEach((b, j) => {
              g.globalAlpha = 1;
              blossom(g, b, (j ? 4 : 5.5) * bloom, colors[(k + j) % colors.length]);
            });
          }
        }

        // Petals falling once the bushes have flowered.
        for (const p of petals) {
          const k = clamp01((t - p.born) / 1100);

          if (k >= 1) continue;

          g.save();
          g.translate(p.x, p.y);
          g.rotate(p.rot);
          g.scale(Math.abs(Math.cos(p.rot * 1.3)) * 0.6 + 0.4, 1);
          g.globalAlpha = 1 - k;
          g.fillStyle = p.color;
          g.beginPath();
          g.ellipse(0, 0, 2.6, 1.7, 0, 0, Math.PI * 2);
          g.fill();
          g.restore();
        }

        // The risen warrior has leaves caught in their hair.
        const caught = clamp01((t - RISE_MS - 200) / 300) * (1 - clamp01((t - TOTAL_MS + 400) / 400));

        if (caught > 0) {
          g.globalAlpha = caught;

          for (const [dx, a] of [[-0.6, -2.2], [0.1, -1.4], [0.6, -0.9]] as const) leaf(g, { x: face.x + dx * face.r, y: face.y - face.r * 0.85 }, a, 7);
        }

        g.globalAlpha = 1;
      },
      (t, dt) => {
        if (t > BLOOM_MS + 350 && t < RISE_MS + 500 && chance(0.7, dt)) {
          const s = pick(stems);

          const b = pick(s.blossoms);

          petals.push({ x: b.x, y: b.y, vx: rand(-15, 15), vy: rand(10, 25), rot: rand(0, 6), spin: rand(-4, 4), color: pick(BLOSSOM), born: t });
        }

        for (const p of petals) {
          p.x += (p.vx + Math.sin(t / 200 + p.spin) * 12) * dt;
          p.y += p.vy * dt;
          p.rot += p.spin * dt;
        }
      },
    );

    void shoot(stage, from, { x: target.x, y: ground - 4 }, SEED_MS, "#7fe88a", MOTES, 6);

    schedule(stage, RISE_MS, () => {
      void animateEl(stage, el, RISE, { duration: 900, easing: "ease-out" });

      for (let k = 0; k < 18; k++) emit(stage, { x: target.x + rand(-w, w), y: target.y + rand(-h * 0.4, h) }, { tints: MOTES, speed: [20, 60], angle: [-Math.PI * 0.75, -Math.PI * 0.25], life: [0.6, 1.1], scale: [0.25, 0.04], gravity: -30 });
    });

    await run;
  });
