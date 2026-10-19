import { halfSize } from "../runtime/anchors";
import { sinkingBadge } from "../runtime/badge";
import { clamp01, easeOutCubic } from "../runtime/easing";
import { arcControl, bezier, type Debris, type FxPoint, pick, rand, stepBodies } from "../runtime/geometry";
import { perTarget } from "../runtime/recipes";
import { drawRustPatch, polyline, type RustPatch,rustPatch } from "../runtime/shapes";
import { animateEl, show, type Stage, tween, wait } from "../runtime/stage";
import { glow, sprite } from "../runtime/texture";
import type { FxAnimation } from "./types";

import { IMPACT_MS } from "@/lib/utils/battle/fx";

const HIT_MS = IMPACT_MS.rust;

const TOTAL_MS = 2600;

const FADE_MS = 2150;

const FLAKES = ["#8a3e12", "#a8521c", "#5a2a0e", "#c0682a"];

const BADGE = { top: "#6a3418", bottom: "#24120a", rim: "#c0682a", ink: "#f0d8c0" };

interface Blot {
  x: number;
  y: number;
  r: number;
  born: number;
  patch: RustPatch;
}

interface Flake extends Debris {
  rot: number;
  spin: number;
  size: number;
  color: string;
  born: number;
}

async function drip(stage: Stage, from: FxPoint, to: FxPoint) {
  const ctrl = arcControl(from, to, 50);

  const halo = glow("#a0521e");

  const core = glow("#1a0e06");

  let pos = from;

  const hide = show(stage, (g) => {
    sprite(g, halo, pos.x, pos.y, 0.5, undefined, 0.9);
    sprite(g, core, pos.x, pos.y, 0.3, undefined, 1, false);
  });

  await tween(stage, HIT_MS, (k) => (pos = bezier(from, ctrl, to, k ** 1.3)));
  hide();
}

// A crack wandering from a blot across the row, as a jagged polyline.
function crack(from: FxPoint, angle: number, len: number): FxPoint[] {
  const pts = [from];

  let a = angle;

  for (let n = 1; n <= 7; n++) {
    a += rand(-0.6, 0.6);

    const prev = pts[pts.length - 1];

    pts.push({ x: prev.x + Math.cos(a) * (len / 7), y: prev.y + Math.sin(a) * (len / 7) * 0.6 });
  }

  return pts;
}

export const rust: FxAnimation = ({ stage, from, to, targetEls }) =>
  perTarget(stage, to, 0, async (target, i) => {
    await drip(stage, from, target);

    const el = targetEls[i];

    const { w, h } = halfSize(el);

    const blots: Blot[] = Array.from({ length: 8 }, (_, n) => {
      const r = rand(0.5, 0.75) * Math.min(h, 26);

      return { x: target.x + (n === 0 ? 0 : rand(-w * 0.85, w * 0.85)), y: target.y + (n === 0 ? 0 : rand(-h * 0.7, h * 0.7)), r, born: n * 70, patch: rustPatch(r) };
    });

    const cracks = blots.slice(0, 4).map((b) => crack(b, rand(0, Math.PI * 2), rand(w * 0.4, w * 0.7)));

    const flakes: Flake[] = [];

    const halo = glow("#7a3410");

    let t = 0;

    const hide = show(stage, (g) => {
      const fade = 1 - clamp01((t - FADE_MS + HIT_MS) / 450);

      // Black rust blooms from the splash and spreads over armour and skin.
      for (const b of blots) {
        const grow = easeOutCubic(clamp01((t - b.born) / 600));

        if (grow <= 0) continue;

        sprite(g, halo, b.x, b.y, (b.r * 2.8 * grow) / 64, (b.r * 2.2 * grow) / 64, 0.7 * fade, false);
        g.save();
        g.translate(b.x, b.y);
        g.scale(grow, grow * 0.8);
        g.globalAlpha = fade;
        g.globalCompositeOperation = "source-over";
        drawRustPatch(g, b.patch);
        g.restore();
      }

      // Then the skin cracks like old parchment.
      const split = clamp01((t - 250) / 700);

      if (split > 0) {
        g.globalCompositeOperation = "source-over";
        g.lineCap = "round";
        g.lineJoin = "round";

        for (const c of cracks) {
          g.globalAlpha = fade;
          g.strokeStyle = "rgba(10,6,4,0.85)";
          g.lineWidth = 2.6;
          polyline(g, c, split);
          g.strokeStyle = "rgba(226,214,196,0.75)";
          g.lineWidth = 0.9;
          polyline(g, c, split);
        }
      }

      g.globalCompositeOperation = "source-over";

      for (const f of flakes) {
        const k = clamp01((t - f.born) / 900);

        g.save();
        g.translate(f.x, f.y);
        g.rotate(f.rot);
        g.scale(1, Math.cos(f.rot * 2));
        g.globalAlpha = 1 - k;
        g.fillStyle = f.color;
        g.fillRect(-f.size / 2, -f.size / 3, f.size, f.size * 0.66);
        g.restore();
      }

      sinkingBadge(g, target.x, target.y - h - 12, clamp01((t - 700) / 1300), "−2 КБ", BADGE);
      g.globalAlpha = 1;
    });

    const corrode = el
      ? animateEl(stage, el, [{ filter: "none" }, { filter: "grayscale(.85) sepia(.35) brightness(.75) contrast(1.1)", offset: 0.3 }, { filter: "grayscale(.85) sepia(.35) brightness(.75) contrast(1.1)", offset: 0.8 }, { filter: "none" }], { duration: TOTAL_MS - HIT_MS })
      : wait(stage, 0);

    const run = tween(stage, TOTAL_MS - HIT_MS, (k, dt) => {
      t = k * (TOTAL_MS - HIT_MS);

      // Rust flakes peel off and flutter down.
      if (t > 350 && t < FADE_MS - HIT_MS && Math.random() < 0.55) {
        const b = pick(blots);

        flakes.push({ x: b.x + rand(-b.r, b.r), y: b.y + rand(-b.r, b.r) * 0.5, vx: rand(-25, 25), vy: rand(-30, 0), rot: rand(0, 6), spin: rand(-6, 6), size: rand(2.5, 4.5), color: pick(FLAKES), born: t });
      }

      stepBodies(flakes, dt, 160);

      for (const f of flakes) f.vx *= 1 - 2 * dt;

      while (flakes.length && t - flakes[0].born > 900) flakes.shift();
    }).then(hide);

    await Promise.all([run, corrode]);
  });
