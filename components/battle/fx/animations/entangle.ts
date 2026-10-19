import { clamp01 } from "../runtime/easing";
import { chance, cubicBezier, type FxPoint, rand } from "../runtime/geometry";
import { emit, flash } from "../runtime/primitives";
import { perTarget } from "../runtime/recipes";
import { leafPath, taperedStroke } from "../runtime/shapes";
import { show, tween, wait } from "../runtime/stage";
import type { FxAnimation } from "./types";

import { ARCHETYPE_FX } from "@/lib/utils/battle/fx";

interface Vine {
  pts: [FxPoint, FxPoint, FxPoint, FxPoint];
  width: number;
  delay: number;
  leaves: number[];
  side: number;
}

const DUST = ["#a8c070", "#7a9a48", "#8a7a4a", "#c8d890"];

const LEAD_MS = 120;

// The vines close on the target at the impact moment.
const GROW_MS = ARCHETYPE_FX.entangle.impactMs - LEAD_MS;

const HOLD_MS = 650;

const FADE_MS = 350;

// Each vine rises beside the tile and hooks across the portrait from the opposite side.
function makeVine(target: FxPoint, i: number, n: number): Vine {
  const side = i % 2 ? 1 : -1;

  const spread = ((i + 0.5) / n - 0.5) * 2;

  const x0 = target.x + spread * 46 + rand(-6, 6);

  const y0 = target.y + 30;

  const top = target.y - rand(8, 30);

  return {
    pts: [
      { x: x0, y: y0 },
      { x: x0 + side * rand(18, 30), y: y0 - rand(18, 30) },
      { x: target.x + side * rand(26, 40), y: top + rand(10, 20) },
      { x: target.x - side * rand(4, 18), y: top },
    ],
    width: rand(5, 7),
    delay: (i / n) * 0.3,
    leaves: [rand(0.25, 0.4), rand(0.5, 0.65), rand(0.75, 0.9)],
    side,
  };
}

function leaf(g: CanvasRenderingContext2D, at: FxPoint, angle: number, size: number) {
  g.save();
  g.translate(at.x, at.y);
  g.rotate(angle);
  leafPath(g, 0, size, size * 0.55);
  g.fillStyle = "#6cc040";
  g.fill();
  g.strokeStyle = "#24501a";
  g.lineWidth = 0.9;
  g.stroke();
  g.restore();
}

function drawVine(g: CanvasRenderingContext2D, v: Vine, grow: number) {
  const p = clamp01((grow - v.delay) / (1 - v.delay));

  if (p <= 0) return;

  const steps = Math.max(2, Math.round(28 * p));

  const line = Array.from({ length: steps + 1 }, (_, i) => cubicBezier(v.pts, (i / steps) * p));

  for (const [extra, color] of [[2.4, "#141a08"], [0, "#4a7420"], [-v.width * 0.7, "#9cc858"]] as const) taperedStroke(g, line, color, v.width + extra, 0.65, 0.7, 28);

  for (const at of v.leaves) {
    if (at > p) continue;

    const a = cubicBezier(v.pts, at);

    const b = cubicBezier(v.pts, Math.min(1, at + 0.04));

    const size = 9 * Math.min(1, (p - at) / 0.15);

    leaf(g, a, Math.atan2(b.y - a.y, b.x - a.x) - v.side * 1.1, size);
  }
}

export const entangle: FxAnimation = async ({ stage, from, to, palette, spec }) => {
  void flash(stage, from, palette.core, 70, 300);
  for (let n = 0; n < 8; n++) emit(stage, from, { tints: palette.tints, speed: [20, 70], life: [0.3, 0.6], scale: [0.25, 0.03], drag: 2 });

  await wait(stage, LEAD_MS);

  await perTarget(stage, to, ARCHETYPE_FX.entangle.staggerMs, async (target) => {
    const n = spec.critical ? 8 : 6;

    const vines = Array.from({ length: n }, (_, i) => makeVine(target, i, n));

    let grow = 0;

    let fade = 1;

    const hide = show(stage, (g) => {
      g.save();
      g.globalAlpha = fade;
      g.globalCompositeOperation = "source-over";
      g.lineCap = "round";
      g.lineJoin = "round";

      const ground = g.createRadialGradient(target.x, target.y + 30, 2, target.x, target.y + 30, 60);

      ground.addColorStop(0, `rgba(60,40,16,${0.9 * Math.min(1, grow * 2)})`);
      ground.addColorStop(1, "rgba(70,50,22,0)");
      g.fillStyle = ground;
      g.beginPath();
      g.ellipse(target.x, target.y + 30, 60, 14, 0, 0, Math.PI * 2);
      g.fill();

      for (const v of vines) drawVine(g, v, grow);

      g.restore();
    });

    const dust = (strength: number) => emit(stage, { x: target.x + rand(-48, 48), y: target.y + 28 }, { tints: DUST, speed: [15, 60], angle: [-Math.PI * 0.85, -Math.PI * 0.15], life: [0.5, 0.9], scale: [0.35, 0.9 * strength], gravity: 30, drag: 2.5, additive: false, alpha: 0.6 });

    for (let i = 0; i < 10; i++) dust(1);

    await tween(stage, GROW_MS, (k, dt) => {
      grow = 1 - (1 - k) ** 2;

      if (chance(0.6, dt)) dust(0.8);
    });

    for (let i = 0; i < 12; i++) emit(stage, { x: target.x + rand(-30, 30), y: target.y + rand(-20, 20) }, { tints: ["#e8ffb0", "#a8e060", "#ffffff"], speed: [20, 80], life: [0.3, 0.6], scale: [0.18, 0.02], drag: 2 });

    await tween(stage, HOLD_MS, (k) => {
      for (const v of vines) v.pts[3].x += Math.sin(k * 30 + v.side) * 0.08;
    });
    await tween(stage, FADE_MS, (k) => (fade = 1 - k));
    hide();
  });
};
