import { halfSize } from "../runtime/anchors";
import { clamp01, easeOutCubic } from "../runtime/easing";
import { chance, type FxPoint, pick, rand } from "../runtime/geometry";
import { glowPulse } from "../runtime/motion";
import { emit } from "../runtime/primitives";
import { animateEl, schedule, timeline } from "../runtime/stage";
import type { FxAnimation } from "./types";

import { ARCHETYPE_FX } from "@/lib/utils/battle/fx";

const START_MS = 120;

const TOTAL_MS = 2400;

const PETALS = ["#ffffff", "#ffe36a", "#ffb0d0", "#b8c8ff", "#ffd0a0"];

const MOTES = ["#e8ffd8", "#9ff0a0", "#5fd27a"];

const REVIVE = glowPulse("#7fe88a", { brightness: 1.3, saturate: 1.25, peak: 0.3 });

interface Flower extends FxPoint {
  dist: number;
  size: number;
  color: string;
  rot: number;
}

function flower(g: CanvasRenderingContext2D, f: Flower, k: number) {
  const s = f.size * easeOutCubic(k);

  g.save();
  g.translate(f.x, f.y);
  g.rotate(f.rot + k * 0.6);
  g.fillStyle = "#3e8a2e";
  g.fillRect(-0.6, 0, 1.2, s * 1.4);
  g.fillStyle = f.color;

  for (let n = 0; n < 5; n++) {
    g.rotate((Math.PI * 2) / 5);
    g.beginPath();
    g.ellipse(0, -s * 0.55, s * 0.32, s * 0.55, 0, 0, Math.PI * 2);
    g.fill();
  }

  g.fillStyle = "#f2b400";
  g.beginPath();
  g.arc(0, 0, s * 0.28, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

export const healwave: FxAnimation = ({ stage, from, to, targetEls }) => {
  const W = stage.layer.clientWidth;

  const Hf = stage.layer.clientHeight;

  const far = Math.max(...to.map((p) => Math.hypot(p.x - from.x, p.y - from.y)));

  // The wave reaches the farthest ally at the impact, then rolls on across the field.
  const speed = Math.max(far + 30, 80) / (ARCHETYPE_FX.healwave.impactMs - START_MS);

  const reach = Math.max(Math.hypot(W, Hf), far + 60);

  const rows = to.map((p, i) => ({ p, ...halfSize(targetEls[i]), dist: Math.hypot(p.x - from.x, p.y - from.y) }));

  const flowers: Flower[] = [];

  for (const r of rows) {
    for (let n = 0; n < 7; n++) {
      const x = r.p.x - r.w + ((n + rand(0.2, 0.8)) / 7) * r.w * 2;

      const y = r.p.y + r.h - rand(0, 4);

      flowers.push({ x, y, dist: Math.hypot(x - from.x, y - from.y), size: rand(3, 5), color: pick(PETALS), rot: rand(0, 6) });
    }
  }

  for (let n = 0; n < 22; n++) {
    const x = rand(8, W - 8);

    const y = rand(8, Hf - 8);

    flowers.push({ x, y, dist: Math.hypot(x - from.x, y - from.y), size: rand(2.2, 3.6), color: pick(PETALS), rot: rand(0, 6) });
  }

  const radius = (t: number) => Math.max(0, (t - START_MS) * speed);

  const run = timeline(
    stage,
    TOTAL_MS,
    (g, t) => {
      const r = radius(t);

      const fade = 1 - clamp01(r / reach);

      // The green wave: a soft band with a bright crest, flattened like it rolls over the ground.
      if (r > 0 && fade > 0) {
        const band = Math.min(46, 14 + r * 0.25);

        g.save();
        g.translate(from.x, from.y);
        g.scale(1, 0.62);

        const grad = g.createRadialGradient(0, 0, Math.max(0, r - band), 0, 0, r + 3);

        grad.addColorStop(0, "rgba(90,210,120,0)");
        grad.addColorStop(0.7, `rgba(110,230,140,${0.32 * fade})`);
        grad.addColorStop(0.93, `rgba(200,255,200,${0.7 * fade})`);
        grad.addColorStop(1, "rgba(200,255,200,0)");
        g.globalCompositeOperation = "lighter";
        g.globalAlpha = 1;
        g.fillStyle = grad;
        g.beginPath();
        g.arc(0, 0, r + 3, 0, Math.PI * 2);
        g.fill();
        g.restore();
      }

      // Wildflowers open wherever the wave has passed, then wilt away.
      g.globalCompositeOperation = "source-over";

      for (const f of flowers) {
        const passed = (r - f.dist) / speed;

        if (passed <= 0) continue;

        const k = clamp01(passed / 260);

        const wilt = 1 - clamp01((t - TOTAL_MS + 500) / 450);

        g.globalAlpha = wilt;
        flower(g, f, k);
      }

      g.globalAlpha = 1;
    },
    (t, dt) => {
      // A few petals lifted off by the wave's breath.
      if (t > ARCHETYPE_FX.healwave.impactMs && t < TOTAL_MS - 500 && chance(0.35, dt)) {
        const f = pick(flowers);

        if (radius(t) > f.dist) emit(stage, f, { tints: PETALS.slice(0, 3), speed: [10, 30], angle: [-Math.PI * 0.8, -Math.PI * 0.2], life: [0.6, 1], scale: [0.14, 0.05], gravity: -10, additive: false, alpha: 0.9 });
      }
    },
  );

  rows.forEach((row, i) => {
    schedule(stage, START_MS + row.dist / speed, () => {
      for (let n = 0; n < 12; n++) emit(stage, { x: row.p.x + rand(-row.w, row.w), y: row.p.y + rand(-row.h * 0.4, row.h) }, { tints: MOTES, speed: [20, 60], angle: [-Math.PI * 0.75, -Math.PI * 0.25], life: [0.6, 1.1], scale: [0.25, 0.04], gravity: -30 });

      void animateEl(stage, targetEls[i], REVIVE, { duration: 900, easing: "ease-out" });
    });
  });

  return run;
};
