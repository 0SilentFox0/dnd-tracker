import { halfSize } from "../runtime/anchors";
import { clamp01, easeOutCubic, envelope } from "../runtime/easing";
import { arcControl, bezier, chance, farSide, type FxPoint, rand } from "../runtime/geometry";
import { motionPath } from "../runtime/motion";
import { emit, flash } from "../runtime/primitives";
import { perTarget } from "../runtime/recipes";
import { chainLink, shackle, taperedStroke } from "../runtime/shapes";
import { animateEl, schedule, show, type Stage, tween, wait } from "../runtime/stage";
import { streakBurst } from "../runtime/streaks";
import { glow, sprite, spritePx } from "../runtime/texture";
import type { FxAnimation } from "./types";

import { IMPACT_MS } from "@/lib/utils/battle/fx";

const TOTAL_MS = 2600;

const CHAIN_MS = 760;

const CLAMP_MS = 980;

const FADE_MS = 2150;

const SMOKE = ["#1a1226", "#2a1e3a", "#120c1a"];

const SPARKS = ["#ffffff", "#d8d4e4", "#9a94aa"];

interface Tendril {
  x: number;
  len: number;
  phase: number;
  curl: number;
  born: number;
}

async function drift(stage: Stage, from: FxPoint, to: FxPoint) {
  const ctrl = arcControl(from, to, 30);

  const halo = glow("#5a3a80");

  let pos = from;

  const hide = show(stage, (g) => {
    sprite(g, halo, pos.x, pos.y, 0.9, undefined, 0.8);
    sprite(g, glow("#0c0812"), pos.x, pos.y, 0.6, undefined, 0.95, false);
  });

  await tween(stage, IMPACT_MS.slow, (k) => {
    pos = bezier(from, ctrl, to, easeOutCubic(k));
    emit(stage, pos, { tints: SMOKE, speed: [4, 16], life: [0.6, 1], scale: [0.5, 0.9], spread: 5, additive: false, alpha: 0.55, gravity: 20 });
  });
  hide();
}

function chainPoints(a: FxPoint, b: FxPoint, sag: number, upTo: number) {
  const ctrl = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + sag };

  const n = Math.max(2, Math.floor(Math.hypot(b.x - a.x, b.y - a.y) / 9));

  const shown = Math.floor(n * upTo);

  return Array.from({ length: shown }, (_, i) => {
    const u = (i + 0.5) / n;

    const p = bezier(a, ctrl, b, u);

    const q = bezier(a, ctrl, b, Math.min(1, u + 0.02));

    return { x: p.x, y: p.y, angle: Math.atan2(q.y - p.y, q.x - p.x), flat: i % 2 === 0 };
  });
}

export const slow: FxAnimation = ({ stage, from, to, targetEls }) =>
  perTarget(stage, to, 0, async (target, i) => {
    await drift(stage, from, target);

    const el = targetEls[i];

    const { w, h } = halfSize(el);

    const dir = farSide(target, from, stage.layer.clientWidth);

    // The row is hauled back towards the darkness in heavy jerks and only then let go.
    const drag = motionPath([
      { at: 0, x: 0, y: 0 },
      { at: CLAMP_MS - IMPACT_MS.slow + 160, x: 0, y: 0 },
      { at: CLAMP_MS - IMPACT_MS.slow + 300, x: dir * 8, y: 2, rot: dir * -2 },
      { at: CLAMP_MS - IMPACT_MS.slow + 520, x: dir * 5, y: 1, rot: dir * 1 },
      { at: CLAMP_MS - IMPACT_MS.slow + 820, x: dir * 13, y: 3, rot: dir * -1.5 },
      { at: FADE_MS - IMPACT_MS.slow, x: dir * 14, y: 3 },
      { at: TOTAL_MS - IMPACT_MS.slow, x: 0, y: 0 },
    ]);

    const cuffs = [
      { x: -dir * w * 0.3, y: -h * 0.15, r: Math.max(7, h * 0.32) },
      { x: -dir * w * 0.02, y: h * 0.5, r: Math.max(7, h * 0.3) },
    ];

    // A shadow rift on the far side, kept inside the layer so the chains never run off it.
    const rift = { x: Math.max(16, Math.min(stage.layer.clientWidth - 16, target.x + dir * (w + 26))), y: target.y };

    const tendrils: Tendril[] = Array.from({ length: 5 }, (_, n) => ({ x: (-0.8 + (1.6 * n) / 4) * w + rand(-5, 5), len: h * 1.7 + rand(0, 8), phase: rand(0, 6), curl: w * rand(0.25, 0.4), born: n * 70 }));

    const pool = glow("#100a18");

        let t = 0;

    const hide = show(stage, (g) => {
      const m = drag.sample(t);

      const fade = 1 - clamp01((t - (FADE_MS - IMPACT_MS.slow)) / 400);

      const rise = envelope(clamp01(t / (TOTAL_MS - IMPACT_MS.slow)), 0.12, 0.2);

      spritePx(g, pool, target.x + m.x, target.y + h, w * 2.8, h * 1.3, rise * 0.9, false);

      // Shadow tendrils coil up out of the pool and around the row.
      for (const td of tendrils) {
        const grow = easeOutCubic(clamp01((t - td.born) / 450));

        if (grow <= 0) continue;

        const base = { x: target.x + m.x + td.x, y: target.y + h * 0.95 };

        // Each one rises and hooks over towards the rift, as if hauling the row in.
        const pts = Array.from({ length: 13 }, (_, n) => {
          const u = (n / 12) * grow;

          return { x: base.x + dir * (1 - Math.cos((u * Math.PI) / 2)) * td.curl + Math.sin(u * 4 + t / 420 + td.phase) * 3, y: base.y - Math.sin((u * Math.PI) / 2) * td.len };
        });

        g.globalAlpha = fade;
        g.globalCompositeOperation = "source-over";
        g.lineCap = "round";
        taperedStroke(g, pts, "rgba(120,80,175,0.6)", 12, 0.85, 1.8);
        taperedStroke(g, pts, "#0c0712", 8.5, 0.9, 1);
      }

      // Chains lash out of two shadow rifts on the far side and lock iron cuffs onto the row.
      const reach = clamp01((t - (CHAIN_MS - IMPACT_MS.slow)) / (CLAMP_MS - CHAIN_MS));

      const open = envelope(clamp01((t - (CHAIN_MS - IMPACT_MS.slow) + 200) / (TOTAL_MS - CHAIN_MS)), 0.12, 0.25);

      if (open > 0) {
        spritePx(g, pool, rift.x, rift.y, 44, 64, open, false);
        g.globalCompositeOperation = "lighter";
        g.strokeStyle = "#7a4ab0";
        g.lineWidth = 1.6;

        for (let n = 0; n < 3; n++) {
          const a = -t / 260 + (n * Math.PI * 2) / 3;

          g.globalAlpha = open * 0.8;
          g.beginPath();
          g.ellipse(rift.x, rift.y, 9 + n * 4, 18 + n * 6, 0, a, a + 2);
          g.stroke();
        }
      }

      if (reach > 0) {
        cuffs.forEach((cuff, n) => {
          const end = { x: target.x + m.x + cuff.x, y: target.y + m.y + cuff.y };

          const tight = clamp01((t - (CLAMP_MS - IMPACT_MS.slow) - 120) / 200);

          const start = { x: rift.x, y: rift.y + (n ? 8 : -8) };

          g.globalAlpha = fade;

          for (const l of chainPoints(start, end, 18 * (1 - tight) + 2, easeOutCubic(reach))) chainLink(g, l.x, l.y, l.angle, l.flat, 0.9, "#9a96aa");

          if (reach >= 1) {
            const snap = clamp01((t - (CLAMP_MS - IMPACT_MS.slow)) / 120);

            g.globalAlpha = fade;
            shackle(g, end.x, end.y, cuff.r * (1.5 - 0.5 * snap), Math.PI / 2 + dir * 0.25);
          }
        });
      }

      g.globalAlpha = 1;
    });

    for (const [n, cuff] of cuffs.entries()) {
      schedule(stage, CLAMP_MS - IMPACT_MS.slow + n * 40, () => {
        const m = drag.sample(t);

        const at = { x: target.x + m.x + cuff.x, y: target.y + m.y + cuff.y };

        void flash(stage, at, "#e8e4f4", 26, 220);
        void streakBurst(stage, at, { colors: SPARKS, count: 12, speed: [120, 260], life: [0.2, 0.4], gravity: 400 });
      });
    }

    const heavy = el
      ? Promise.all([
          animateEl(stage, el, drag.keyframes, { duration: drag.duration, easing: "ease-in-out" }),
          animateEl(stage, el, [{ filter: "none" }, { filter: "grayscale(.65) brightness(.72)", offset: 0.25 }, { filter: "grayscale(.65) brightness(.72)", offset: 0.8 }, { filter: "none" }], { duration: drag.duration }),
        ])
      : wait(stage, 0);

    const run = tween(stage, TOTAL_MS - IMPACT_MS.slow, (k, dt) => {
      t = k * (TOTAL_MS - IMPACT_MS.slow);

      const m = drag.sample(t);

      // Heavy smoke sinking off the row, and dust where its feet scrape as it is hauled back.
      if (t < FADE_MS - IMPACT_MS.slow && chance(0.5, dt)) emit(stage, { x: target.x + m.x + rand(-w, w), y: target.y + rand(-h, 0) }, { tints: SMOKE, speed: [4, 12], angle: [Math.PI * 0.4, Math.PI * 0.6], life: [0.8, 1.3], scale: [0.4, 0.9], additive: false, alpha: 0.45, gravity: 30 });

      if (t > CLAMP_MS - IMPACT_MS.slow + 140 && t < 1400 && chance(0.5, dt)) emit(stage, { x: target.x + m.x - dir * rand(0, w * 0.6), y: target.y + h }, { tints: ["#6a6058", "#4a423c"], speed: [10, 40], angle: dir > 0 ? [Math.PI * 1.05, Math.PI * 1.3] : [-Math.PI * 0.3, -Math.PI * 0.05], life: [0.5, 0.8], scale: [0.3, 0.7], additive: false, alpha: 0.4 });
    }).then(hide);

    await Promise.all([run, heavy]);
  });
