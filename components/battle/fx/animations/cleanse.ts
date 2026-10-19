import { halfSize } from "../runtime/anchors";
import { lightBeam } from "../runtime/beam";
import { clamp01, easeOutCubic, envelope } from "../runtime/easing";
import { chance, type Debris, type FxPoint, perTick, rand, stepBodies } from "../runtime/geometry";
import { emit, flash, ring } from "../runtime/primitives";
import { perTarget } from "../runtime/recipes";
import { chainLink, jaggedShape, polyPath, twinkle } from "../runtime/shapes";
import { animateEl, schedule, timeline } from "../runtime/stage";
import { glow, sprite } from "../runtime/texture";
import type { FxAnimation } from "./types";

import { ARCHETYPE_FX } from "@/lib/utils/battle/fx";

const WASH_AT = ARCHETYPE_FX.cleanse.impactMs;

const TOTAL_MS = 2700;

const STEAM = ["#d8d4e0", "#b8b2c4", "#ffffff"];

const WATER = ["#ffffff", "#e8f6ff", "#bfe4ff"];

interface Stain {
  x: number;
  y: number;
  r: number;
  born: number;
  gone: number;
  blob: FxPoint[];
}

interface Shard extends Debris {
  rot: number;
  spin: number;
  shape: FxPoint[];
  color: string;
}

// Corruption clinging to the hero: ink blots, two chains crossed over the row and hovering hex sigils.
function stains(w: number, h: number): Stain[] {
  return Array.from({ length: 8 }, (_, n) => {
    const r = rand(9, 15);

    return { x: rand(-w * 0.8, w * 0.8), y: rand(-h * 0.6, h * 0.6), r, born: n * 50, gone: WASH_AT + 80 + n * 70, blob: jaggedShape(4, r, 0.5, 0.4) };
  });
}

function chainLinks(a: FxPoint, b: FxPoint) {
  const len = Math.hypot(b.x - a.x, b.y - a.y);

  const n = Math.floor(len / 11);

  return Array.from({ length: n }, (_, i) => ({ x: a.x + ((b.x - a.x) * (i + 0.5)) / n, y: a.y + ((b.y - a.y) * (i + 0.5)) / n, flat: i % 2 === 0 }));
}

function sigil(g: CanvasRenderingContext2D, x: number, y: number, r: number, spin: number, alpha: number) {
  g.save();
  g.translate(x, y);
  g.rotate(spin);
  g.globalAlpha = alpha;
  g.globalCompositeOperation = "source-over";
  g.fillStyle = "rgba(24,8,32,0.75)";
  g.beginPath();
  g.arc(0, 0, r, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "#a04de0";
  g.lineWidth = 1.6;
  g.shadowColor = "#a04de0";
  g.shadowBlur = 6;
  g.stroke();
  g.beginPath();

  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 2;

    g.lineTo(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7);
  }

  g.closePath();
  g.moveTo(0, -r * 0.7);
  g.lineTo(0, r * 0.35);
  g.stroke();
  g.shadowBlur = 0;
  g.restore();
}

export const cleanse: FxAnimation = ({ stage, to, targetEls }) =>
  perTarget(stage, to, 0, async (target, i) => {
    const el = targetEls[i];

    const { w, h } = halfSize(el);

    const blots = stains(w, h);

    const chains = [chainLinks({ x: -w * 0.95, y: -h * 0.85 }, { x: w * 0.95, y: h * 0.85 }), chainLinks({ x: -w * 0.95, y: h * 0.85 }, { x: w * 0.95, y: -h * 0.85 })];

    const angles = [Math.atan2(h * 1.7, w * 1.9), Math.atan2(-h * 1.7, w * 1.9)];

    const sigils = [-0.55, 0.55].map((f, n) => ({ x: target.x + w * f, y: target.y - h - 12, r: 11, spin: n ? 0.6 : -0.4 }));

    const shards: Shard[] = [];

    const sky = Math.min(target.y - h - 40, Math.max(-30, target.y - 300));

    const halo = glow("#fffbe8");

    const ink = stage.g.createRadialGradient(0, 0, 0, 0, 0, 11);

    ink.addColorStop(0, "rgba(8,2,12,0.95)");
    ink.addColorStop(0.65, "rgba(24,6,36,0.8)");
    ink.addColorStop(1, "rgba(60,20,90,0)");

    const taint = glow("#8a2be2");

    let broken = false;

    const run = timeline(
      stage,
      TOTAL_MS,
      (g, t) => {
        const wash = envelope(clamp01((t - WASH_AT + 220) / 1100), 0.18, 0.4);

        // The dark first: blots, then the chains wrapping on, then the sigils.
        g.globalCompositeOperation = "source-over";

        for (const s of blots) {
          const grow = easeOutCubic(clamp01((t - s.born) / 260));

          const melt = clamp01((t - s.gone) / 420);

          const k = grow * (1 - melt);

          if (k <= 0) continue;

          g.save();
          g.translate(target.x + s.x, target.y + s.y + melt * 4);
          g.scale(k, k * (1 - melt * 0.4));
          sprite(g, taint, 0, 0, (s.r * 3) / 64, undefined, 0.8);
          g.globalCompositeOperation = "source-over";
          g.globalAlpha = 1;

          for (const p of s.blob) {
            g.fillStyle = ink;
            g.beginPath();
            g.arc(p.x * 0.55, p.y * 0.55, s.r * 0.7, 0, Math.PI * 2);
            g.fill();
          }

          g.restore();
        }

        if (!broken) {
          const wrap = clamp01((t - 150) / 380);

          chains.forEach((links, c) => {
            const n = Math.floor(links.length * wrap);

            for (let l = 0; l < n; l++) chainLink(g, target.x + links[l].x, target.y + links[l].y, angles[c], links[l].flat);
          });
        }

        for (const s of sigils) {
          const k = clamp01((t - 280) / 300);

          if (k <= 0 || t > WASH_AT + 260) continue;

          sigil(g, s.x, s.y + Math.sin(t / 220 + s.spin) * 2, s.r * easeOutCubic(k), s.spin + t / 900, k);
        }

        // White water pouring out of a clear sky, wider where it lands.
        if (wash > 0) {
          const top = sky;

          const land = target.y + h * 0.4;

          const fall = clamp01((t - WASH_AT + 220) / 220);

          lightBeam(g, target.x, top, top + (land - top) * fall, w * 0.55, wash * 0.85, "220,240,255");
          sprite(g, halo, target.x, target.y, (w * 2.6) / 64, (h * 3) / 64, wash * 0.55);
        }

        // Shattered links and sigil shards tumble away.
        g.globalCompositeOperation = "source-over";

        for (const d of shards) {
          g.save();
          g.translate(d.x, d.y);
          g.rotate(d.rot);
          g.globalAlpha = clamp01(1 - (t - WASH_AT - 200) / 900);
          polyPath(g, d.shape);
          g.fillStyle = d.color;
          g.fill();
          g.restore();
        }

        const clean = clamp01((t - WASH_AT - 700) / 900);

        if (clean > 0 && clean < 1) {
          for (let n = 0; n < 7; n++) {
            const a = n * 2.4 + t / 1200;

            twinkle(g, target.x + Math.cos(a) * w * (0.4 + (n % 3) * 0.25), target.y + Math.sin(a * 1.3) * h * 0.8, 5 + (n % 2) * 3, "#ffffff", Math.sin(clean * Math.PI) * (0.5 + 0.5 * Math.sin(t / 90 + n)));
          }
        }
      },
      (t, dt) => {
        stepBodies(shards, dt, 380);

        if (t > WASH_AT - 100 && t < WASH_AT + 800) {
          perTick(3, dt, () => emit(stage, { x: target.x + rand(-w * 0.5, w * 0.5), y: sky + rand(0, target.y - sky) }, { tints: WATER, speed: [260, 360], angle: [Math.PI / 2 - 0.05, Math.PI / 2 + 0.05], life: [0.12, 0.25], scale: [0.16, 0.08] }));

          if (chance(0.6, dt)) emit(stage, { x: target.x + rand(-w * 0.8, w * 0.8), y: target.y + h * 0.5 }, { tints: WATER, speed: [40, 120], angle: [-Math.PI * 0.85, -Math.PI * 0.15], life: [0.3, 0.5], scale: [0.18, 0.04], gravity: 300 });
        }
      },
    );

    const shatter = () => {
      broken = true;

      chains.forEach((links, c) => {
        for (const l of links) {
          const out = Math.atan2(l.y, l.x) + rand(-0.5, 0.5);

          const v = rand(80, 200);

          shards.push({ x: target.x + l.x, y: target.y + l.y, vx: Math.cos(out) * v, vy: Math.sin(out) * v - 60, rot: angles[c], spin: rand(-10, 10), shape: jaggedShape(4, rand(3, 5), 0.3, 0.5), color: "#4a4256" });
        }
      });

      for (const s of sigils) {
        for (let n = 0; n < 9; n++) {
          const a = (n / 9) * Math.PI * 2;

          shards.push({ x: s.x, y: s.y, vx: Math.cos(a) * rand(70, 160), vy: Math.sin(a) * rand(70, 160) - 40, rot: rand(0, 6), spin: rand(-12, 12), shape: jaggedShape(3, rand(3, 6), 0.4, 0.4), color: "#7a2fb0" });
        }

        void flash(stage, s, "#f0e8ff", 50, 300);
      }
    };

    schedule(stage, WASH_AT + 200, shatter);

    for (const s of blots) {
      schedule(stage, s.gone, () => {
        for (let n = 0; n < 5; n++) emit(stage, { x: target.x + s.x, y: target.y + s.y }, { tints: STEAM, speed: [15, 45], angle: [-Math.PI * 0.75, -Math.PI * 0.25], life: [0.6, 1], scale: [0.3, 0.75], additive: false, alpha: 0.45, gravity: -30, spread: s.r * 0.6 });
      });
    }

    // The hero looks sick under the curses until the water hits.
    const sickly = animateEl(stage, el, [{ filter: "none" }, { filter: "brightness(0.7) saturate(0.35)", offset: 0.35 }, { filter: "brightness(0.7) saturate(0.35)", offset: 0.85 }, { filter: "none" }], { duration: WASH_AT + 300 });

    const glowUp = animateEl(stage, el, [{ filter: "none" }, { filter: "brightness(1.6) saturate(1.15)", offset: 0.35 }, { filter: "none" }], { duration: 1100, delay: WASH_AT + 500, easing: "ease-out" });

    schedule(stage, WASH_AT + 650, () => void ring(stage, target, "#ffffff", 700, w * 0.9, 3, 0.45));


    await Promise.all([run, sickly, glowUp]);
  });
