import { faceOf, halfSize } from "../runtime/anchors";
import { clamp01, easeOutCubic } from "../runtime/easing";
import { type FxPoint, rand } from "../runtime/geometry";
import { emit, ring } from "../runtime/primitives";
import { perTarget } from "../runtime/recipes";
import { animateEl, schedule, show, tween } from "../runtime/stage";
import { glow, spritePx } from "../runtime/texture";
import type { FxAnimation } from "./types";

import { IMPACT_MS } from "@/lib/utils/battle/fx";

const FORM_MS = 350;

const BREATH_MS = IMPACT_MS.forestspirit;

const TOTAL_MS = 2700;

const BREATH = ["#e8fff0", "#b8f0c8", "#8fe0a8"];

const FIREFLY = "#e8ff7a";

const SOOTHE: Keyframe[] = [{ filter: "none" }, { filter: "brightness(1.25) saturate(1.2) drop-shadow(0 0 6px #8fe0a8)", offset: 0.35 }, { filter: "none" }];

interface Firefly {
  orbit: number;
  speed: number;
  phase: number;
}

// The stag's silhouette facing −x, in units of its height, the ground under its body at the origin.
const BODY: [number, number][] = [
  [-0.62, -0.84], [-0.5, -0.97], [-0.45, -1.07], [-0.4, -0.98], [-0.35, -0.94], [-0.24, -0.72], [-0.12, -0.66], [0.2, -0.65], [0.36, -0.61], [0.43, -0.63],
  [0.4, -0.55], [0.38, -0.42], [0.33, -0.2], [0.36, -0.1], [0.33, 0], [0.29, 0], [0.28, -0.17], [0.26, -0.36], [0.1, -0.36], [-0.14, -0.37],
  [-0.17, -0.28], [-0.18, 0], [-0.22, 0], [-0.23, -0.3], [-0.28, -0.46], [-0.36, -0.62], [-0.46, -0.79], [-0.56, -0.8],
];

const PIVOT = { x: -0.22, y: -0.62 };

// The neck and head turn down about the withers; the farther from them, the more.
function bowed(x: number, y: number, bow: number): FxPoint {
  const k = clamp01((PIVOT.x - x) / 0.15) * bow;

  if (k <= 0) return { x, y };

  const dx = x - PIVOT.x;

  const dy = y - PIVOT.y;

  return { x: PIVOT.x + dx * Math.cos(-k) - dy * Math.sin(-k), y: PIVOT.y + dx * Math.sin(-k) + dy * Math.cos(-k) };
}

// One antler from (x, y): a beam with tines; tips are collected for the fireflies.
function antler(x: number, y: number, angle: number, len: number, depth: number, out: { lines: [FxPoint, FxPoint][]; tips: FxPoint[] }) {
  const end = { x: x + Math.cos(angle) * len, y: y + Math.sin(angle) * len };

  out.lines.push([{ x, y }, end]);

  if (depth === 0) {
    out.tips.push(end);

    return;
  }

  antler(end.x, end.y, angle + 0.35, len * 0.72, depth - 1, out);
  antler((x + end.x) / 2, (y + end.y) / 2, angle - 0.6, len * 0.5, depth - 1, out);
}

const ANTLERS = (() => {
  const out = { lines: [] as [FxPoint, FxPoint][], tips: [] as FxPoint[] };

  antler(-0.47, -1.0, -1.35, 0.26, 2, out);
  antler(-0.43, -0.99, -1.85, 0.24, 2, out);

  return out;
})();

// Draws the spirit stag at the current transform (`s` px tall) and returns its muzzle and antler tips in the same units.
function stag(g: CanvasRenderingContext2D, s: number, bow: number, alpha: number) {
  const at = (p: FxPoint) => {
    const b = bowed(p.x, p.y, bow);

    return { x: b.x * s, y: b.y * s };
  };

  const fill = g.createLinearGradient(0, -s, 0, 0);

  fill.addColorStop(0, `rgba(210,255,225,${0.7 * alpha})`);
  fill.addColorStop(1, `rgba(110,220,150,${0.3 * alpha})`);
  g.globalCompositeOperation = "lighter";
  g.lineJoin = "round";
  g.lineCap = "round";
  g.fillStyle = fill;
  g.beginPath();

  for (const [x, y] of BODY) {
    const p = at({ x, y });

    g.lineTo(p.x, p.y);
  }

  g.closePath();
  g.fill();
  g.strokeStyle = `rgba(230,255,238,${0.9 * alpha})`;
  g.lineWidth = 1.4;
  g.stroke();
  g.lineWidth = Math.max(1.3, s * 0.025);
  g.beginPath();

  for (const [a, b] of ANTLERS.lines) {
    const pa = at(a);

    const pb = at(b);

    g.moveTo(pa.x, pa.y);
    g.lineTo(pb.x, pb.y);
  }

  g.stroke();

  const eye = at({ x: -0.5, y: -0.92 });

  spritePx(g, glow("#ffffff"), eye.x, eye.y, s * 0.06, undefined, alpha);

  return { muzzle: at({ x: -0.62, y: -0.84 }), tips: ANTLERS.tips.map(at) };
}

export const forestspirit: FxAnimation = ({ stage, from, to, targetEls }) =>
  perTarget(stage, to, 0, async (target, i) => {
    const el = targetEls[i];

    const { h } = halfSize(el);

    const ground = target.y + h;

    const face = faceOf(el, target);

    const S = Math.min(Math.max(40, h * 2.1), (ground - 4) / 1.2);

    const sx = face.x + S * 0.5;

    let tips: FxPoint[] = [];

    let muzzle: FxPoint = { x: sx, y: ground - S * 0.9 };

    const flies: Firefly[] = Array.from({ length: 8 }, () => ({ orbit: rand(10, 26), speed: rand(1.5, 3) * (Math.random() < 0.5 ? -1 : 1), phase: rand(0, 6) }));

    let t = 0;

    const hide = show(stage, (g) => {
      const time = t / 1000;

      const appear = easeOutCubic(clamp01((t - FORM_MS) / 600)) * (1 - clamp01((t - TOTAL_MS + 600) / 600));

      const bow = 0.6 * clamp01((t - BREATH_MS + 250) / 250) * (1 - clamp01((t - BREATH_MS - 700) / 400));

      if (appear > 0) {
        g.save();
        g.translate(sx, ground);
        spritePx(g, glow("#5fd27a"), 0, -S * 0.6, S * 1.3, S * 1.1, 0.45 * appear);
        spritePx(g, glow("#c8ffd8"), 0, -S * 0.55, S * 0.8, S * 0.35, 0.35 * appear);

        const shimmer = 0.85 + Math.sin(time * 5) * 0.15;

        const drawn = stag(g, S, bow, appear * shimmer);

        g.restore();
        tips = drawn.tips.map((p) => ({ x: sx + p.x, y: ground + p.y }));
        muzzle = { x: sx + drawn.muzzle.x, y: ground + drawn.muzzle.y };
      }

      // Fireflies asleep in the antlers wake and drift round the hero.
      const wake = clamp01((t - BREATH_MS) / 700);

      flies.forEach((f, n) => {
        const tip = tips[n % Math.max(1, tips.length)] ?? muzzle;

        const ox = target.x + Math.cos(time * f.speed + f.phase) * (f.orbit + halfSize(el).w * 0.6);

        const oy = target.y + Math.sin(time * f.speed * 1.3 + f.phase) * f.orbit * 0.6;

        const e = wake * wake * (3 - 2 * wake);

        const x = tip.x + (ox - tip.x) * e;

        const y = tip.y + (oy - tip.y) * e;

        const blink = 0.55 + 0.45 * Math.sin(time * 7 + n * 1.7);

        const alpha = Math.max(appear, wake * (1 - clamp01((t - TOTAL_MS + 400) / 400))) * blink;

        spritePx(g, glow("#c8ff5a"), x, y, 9, undefined, alpha * 0.8);
        spritePx(g, glow(FIREFLY), x, y, 3, undefined, alpha);
      });

      g.globalAlpha = 1;
    });

    schedule(stage, FORM_MS, () => void ring(stage, { x: sx, y: ground }, "#9ff0a0", 700, S * 0.5, 2, 0.25));

    schedule(stage, BREATH_MS, () => {
      if (el) void animateEl(stage, el, SOOTHE, { duration: 1200, easing: "ease-out" });
    });

    await tween(stage, TOTAL_MS, (k) => {
      t = k * TOTAL_MS;

      // Green motes drift from the caster to call the spirit.
      if (t < FORM_MS + 200 && Math.random() < 0.6) emit(stage, { x: from.x + rand(-8, 8), y: from.y + rand(-8, 8) }, { tints: BREATH, speed: [20, 50], angle: [Math.atan2(target.y - from.y, sx - from.x) - 0.3, Math.atan2(target.y - from.y, sx - from.x) + 0.3], life: [0.5, 0.8], scale: [0.2, 0.04] });

      // The breath: a soft resin-scented plume rolling over the hero.
      if (t > BREATH_MS - 50 && t < BREATH_MS + 650) {
        const dx = face.x - muzzle.x;

        const dy = target.y - muzzle.y;

        const a = Math.atan2(dy, dx);

        if (Math.random() < 0.8) emit(stage, muzzle, { tints: ["#8fe0a8", "#6fd090", "#b8f0c8"], speed: [40, 80], angle: [a - 0.3, a + 0.3], life: [0.6, 0.9], scale: [0.25, 0.55], drag: 1.5, alpha: 0.35 });
      }
    }).then(() => void hide());
  });
