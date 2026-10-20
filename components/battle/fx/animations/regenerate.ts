import type { FxAnimation } from "./types";

import { halfSize } from "@/components/battle/fx/runtime/anchors";
import { clamp01, easeOutCubic, fadeOut } from "@/components/battle/fx/runtime/easing";
import { pick, rand } from "@/components/battle/fx/runtime/geometry";
import { glowPulse } from "@/components/battle/fx/runtime/motion";
import { emit, shoot } from "@/components/battle/fx/runtime/primitives";
import { perTarget } from "@/components/battle/fx/runtime/recipes";
import { plusSign } from "@/components/battle/fx/runtime/shapes";
import { animateEl, schedule, timeline } from "@/components/battle/fx/runtime/stage";
import { glow, sprite } from "@/components/battle/fx/runtime/texture";
import { ARCHETYPE_FX } from "@/lib/utils/battle/fx";

const DOME_MS = 2350;

const RISE_MS = 450;

// Each pulse is a heartbeat: a strong beat, then a weaker one 170 ms later.
const BEATS = [600, 1200, 1800];

const MOTES = ["#e8ffd8", "#9ff0a0", "#5fd27a", "#ffd98a"];

const BEAT = glowPulse("#6fe07a", { brightness: 1.3, peak: 0.25 });

interface Plus {
  x: number;
  y: number;
  born: number;
  size: number;
}

// Strength of the heartbeat at `t` (0 between beats).
function beatAt(t: number) {
  let v = 0;

  for (const b of BEATS) {
    const lub = t - b;

    const dub = t - b - 170;

    if (lub >= 0 && lub < 400) v = Math.max(v, 1 - lub / 400);

    if (dub >= 0 && dub < 300) v = Math.max(v, 0.6 * (1 - dub / 300));
  }

  return v;
}

export const regenerate: FxAnimation = ({ stage, from, targets, palette }) =>
  perTarget(stage, targets, 0, async ({ at: target, el }) => {
    await shoot(stage, from, target, ARCHETYPE_FX.regenerate.impactMs, palette.core, palette.tints);

    const { w, h } = halfSize(el);

    const rx = w + 12;

    const ry = h + 14;

    const pluses: Plus[] = [];

    const warm = glow("#ffcf6a");

    const green = glow("#6fe07a");

    const run = timeline(stage, DOME_MS, (g, t) => {
      const rise = easeOutCubic(clamp01(t / RISE_MS));

      const fade = fadeOut(t / DOME_MS, 0.86);

      const beat = beatAt(t);

      const floor = target.y + ry;

      g.save();
      g.beginPath();
      g.rect(target.x - rx - 10, floor - ry * 2 * rise - 10, rx * 2 + 20, ry * 2 * rise + 20);
      g.clip();

      // The amber warmth under the skin swells with each beat.
      sprite(g, warm, target.x, target.y, (w * 1.6) / 64, (h * 2.2) / 64, (0.15 + beat * 0.5) * fade);

      const fill = g.createRadialGradient(target.x, target.y, Math.min(rx, ry) * 0.3, target.x, target.y, rx);

      fill.addColorStop(0, "rgba(90,220,120,0)");
      fill.addColorStop(0.75, `rgba(90,220,120,${0.1 + beat * 0.12})`);
      fill.addColorStop(1, `rgba(150,255,170,${0.35 + beat * 0.3})`);
      g.globalAlpha = fade;
      g.globalCompositeOperation = "lighter";
      g.fillStyle = fill;
      g.beginPath();
      g.ellipse(target.x, target.y, rx, ry, 0, 0, Math.PI * 2);
      g.fill();

      // Two meridians, so it reads as a dome and not a flat ring.
      g.strokeStyle = "rgba(170,255,180,0.35)";
      g.lineWidth = 1;

      for (const f of [0.45, 0.8]) {
        g.beginPath();
        g.ellipse(target.x, target.y, rx * f, ry, 0, Math.PI, Math.PI * 2);
        g.stroke();
      }

      g.beginPath();
      g.ellipse(target.x, target.y, rx, ry * 0.3, 0, 0, Math.PI);
      g.stroke();

      g.strokeStyle = "#b8ffc0";
      g.lineWidth = 2 + beat * 2.5;
      g.shadowColor = "#5fd27a";
      g.shadowBlur = 8 + beat * 10;
      g.beginPath();
      g.ellipse(target.x, target.y, rx, ry, 0, 0, Math.PI * 2);
      g.stroke();
      g.shadowBlur = 0;

      g.strokeStyle = "rgba(255,255,255,0.7)";
      g.lineWidth = 2.5;
      g.lineCap = "round";
      g.beginPath();
      g.ellipse(target.x, target.y, rx - 6, ry - 6, 0, Math.PI * 1.12, Math.PI * 1.38);
      g.stroke();

      // The healing wave running out from the heart to the shell.
      for (const b of BEATS) {
        const k = (t - b) / 600;

        if (k <= 0 || k >= 1) continue;

        const e = 0.35 + 0.65 * easeOutCubic(k);

        g.globalAlpha = Math.min(1, k * 4) * (1 - k) * fade * 0.8;
        g.strokeStyle = "#d8ffd0";
        g.lineWidth = 2.5 * (1 - k) + 0.5;
        g.beginPath();
        g.ellipse(target.x, target.y, rx * e, ry * e, 0, 0, Math.PI * 2);
        g.stroke();
      }

      g.restore();

      for (const p of pluses) {
        const k = (t - p.born) / 900;

        if (k <= 0 || k >= 1) continue;

        const y = p.y - easeOutCubic(k) * 34;

        const a = Math.min(1, k * 5, (1 - k) * 2.5);

        sprite(g, green, p.x, y, (p.size * 2.4) / 64, undefined, a * 0.8);
        g.globalCompositeOperation = "lighter";
        g.globalAlpha = a;
        plusSign(g, p.x, y, p.size, "#e8ffe0");
      }

      g.globalAlpha = 1;
    });

    for (const b of BEATS) {
      schedule(stage, b, () => {
        for (let n = 0; n < 4; n++) pluses.push({ x: target.x + rand(-w * 0.8, w * 0.8), y: target.y + rand(-h * 0.3, h * 0.5), born: b + n * 60, size: rand(9, 13) });

        for (let n = 0; n < 10; n++) emit(stage, { x: target.x + rand(-w * 0.8, w * 0.8), y: target.y + rand(0, h) }, { tints: [pick(MOTES)], speed: [20, 50], angle: [-Math.PI * 0.6, -Math.PI * 0.4], life: [0.6, 1], scale: [0.3, 0.05], gravity: -30 });

        void animateEl(stage, el, BEAT, { duration: 420, easing: "ease-out" });
      });
    }

    await run;
  });
