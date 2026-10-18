import { type FxPoint, rand } from "../runtime/geometry";
import { emit, flash } from "../runtime/primitives";
import { show, tween, wait } from "../runtime/stage";
import type { FxAnimation } from "./types";

interface Vine {
  pts: [FxPoint, FxPoint, FxPoint, FxPoint];
  width: number;
  delay: number;
  leaves: number[];
  side: number;
}

const DUST = ["#a8c070", "#7a9a48", "#8a7a4a", "#c8d890"];

const GROW_MS = 380;

const HOLD_MS = 650;

const FADE_MS = 350;

function cubic(p: Vine["pts"], k: number): FxPoint {
  const u = 1 - k;

  return { x: u * u * u * p[0].x + 3 * u * u * k * p[1].x + 3 * u * k * k * p[2].x + k * k * k * p[3].x, y: u * u * u * p[0].y + 3 * u * u * k * p[1].y + 3 * u * k * k * p[2].y + k * k * k * p[3].y };
}

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
  g.beginPath();
  g.moveTo(0, 0);
  g.quadraticCurveTo(size * 0.5, -size * 0.55, size, 0);
  g.quadraticCurveTo(size * 0.5, size * 0.55, 0, 0);
  g.fillStyle = "#6cc040";
  g.fill();
  g.strokeStyle = "#24501a";
  g.lineWidth = 0.9;
  g.stroke();
  g.restore();
}

function drawVine(g: CanvasRenderingContext2D, v: Vine, grow: number) {
  const p = Math.max(0, Math.min(1, (grow - v.delay) / (1 - v.delay)));

  if (p <= 0) return;

  const steps = Math.max(2, Math.round(28 * p));

  const line = Array.from({ length: steps + 1 }, (_, i) => cubic(v.pts, (i / steps) * p));

  for (const [extra, color] of [[2.4, "#141a08"], [0, "#4a7420"], [-v.width * 0.7, "#9cc858"]] as const) {
    g.strokeStyle = color;

    for (let i = 1; i < line.length; i++) {
      g.lineWidth = Math.max(0.7, (v.width + extra) * (1 - (i / 28) * 0.65));
      g.beginPath();
      g.moveTo(line[i - 1].x, line[i - 1].y);
      g.lineTo(line[i].x, line[i].y);
      g.stroke();
    }
  }

  for (const at of v.leaves) {
    if (at > p) continue;

    const a = cubic(v.pts, at);

    const b = cubic(v.pts, Math.min(1, at + 0.04));

    const size = 9 * Math.min(1, (p - at) / 0.15);

    leaf(g, a, Math.atan2(b.y - a.y, b.x - a.x) - v.side * 1.1, size);
  }
}

export const entangle: FxAnimation = async ({ stage, from, to, palette, spec }) => {
  void flash(stage, from, palette.core, 70, 300);
  for (let n = 0; n < 8; n++) emit(stage, from, { tints: palette.tints, speed: [20, 70], life: [0.3, 0.6], scale: [0.25, 0.03], drag: 2 });

  await wait(stage, 120);

  await Promise.all(
    to.map(async (target, ti) => {
      await wait(stage, ti * 60);

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

      await tween(stage, GROW_MS, (k) => {
        grow = 1 - (1 - k) ** 2;

        if (Math.random() < 0.6) dust(0.8);
      });

      for (let i = 0; i < 12; i++) emit(stage, { x: target.x + rand(-30, 30), y: target.y + rand(-20, 20) }, { tints: ["#e8ffb0", "#a8e060", "#ffffff"], speed: [20, 80], life: [0.3, 0.6], scale: [0.18, 0.02], drag: 2 });

      await tween(stage, HOLD_MS, (k) => {
        for (const v of vines) v.pts[3].x += Math.sin(k * 30 + v.side) * 0.08;
      });
      await tween(stage, FADE_MS, (k) => (fade = 1 - k));
      hide();
    }),
  );
};
