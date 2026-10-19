import { easeOutCubic } from "../runtime/easing";
import { arcControl, bezier, chance, type FxPoint, rand } from "../runtime/geometry";
import { emit, flash, ring } from "../runtime/primitives";
import { perTarget } from "../runtime/recipes";
import { show, tween, wait } from "../runtime/stage";
import { streakBurst } from "../runtime/streaks";
import { glow, sprite } from "../runtime/texture";
import type { FxAnimation } from "./types";

import { ARCHETYPE_FX } from "@/lib/utils/battle/fx";

const PIERCE_MS = 110;

const FLY_MS = ARCHETYPE_FX.eldritch.impactMs - PIERCE_MS;

const VIOLET = ["#c77dff", "#9b3dff", "#6a1fd0"];

const SULFUR = ["#fff7b0", "#f2e24a", "#d8c020"];

const SMOKE = ["#4a4420", "#3a3618", "#2a2614"];

const LAYERS = [
  { width: 15, color: "rgba(106,31,208,0.55)", jitter: 4 },
  { width: 9, color: "rgba(176,92,255,0.8)", jitter: 2.4 },
  { width: 3.5, color: "rgba(250,236,255,0.95)", jitter: 0.8 },
];

// Half-width along the flame from the tip (t = 0) to the tail (t = 1): swells a quarter back, then licks out long and thin.
const flameWidth = (t: number) => Math.min(1, t / 0.25) ** 0.6 * (1 - t) ** 1.3;

function flamePath(g: CanvasRenderingContext2D, length: number, width: number, jitter: number, time: number) {
  const n = 14;

  g.beginPath();
  g.moveTo(4, 0);

  for (let i = 1; i <= n; i++) {
    const t = i / n;

    g.lineTo(-t * length, -(flameWidth(t) * width + Math.sin(time * 41 + i * 1.7) * jitter * t));
  }

  for (let i = n; i >= 1; i--) {
    const t = i / n;

    g.lineTo(-t * length, flameWidth(t) * width + Math.sin(time * 37 + i * 2.3) * jitter * t);
  }

  g.closePath();
}

function drawArrow(g: CanvasRenderingContext2D, at: FxPoint, angle: number, length: number, time: number, head: HTMLCanvasElement, flare: number) {
  sprite(g, head, at.x, at.y, 2 + flare, 2 + flare, 0.85);

  g.save();
  g.translate(at.x, at.y);
  g.rotate(angle);
  g.globalCompositeOperation = "lighter";
  g.globalAlpha = 1;

  for (const l of LAYERS) {
    flamePath(g, length, l.width, l.jitter, time);
    g.fillStyle = l.color;
    g.fill();
  }

  g.beginPath();
  g.moveTo(24, 0);
  g.lineTo(2, -10);
  g.lineTo(8, 0);
  g.lineTo(2, 10);
  g.closePath();
  g.fillStyle = "#fbf2ff";
  g.shadowColor = "#b45cff";
  g.shadowBlur = 10;
  g.fill();
  g.restore();
}

export const eldritch: FxAnimation = ({ stage, from, to, spec }) => {
  const head = glow("#a040ff");

  return perTarget(stage, to, 0, async (target) => {
    const ctrl = arcControl(from, target, 34);

    let pos = from;

    let angle = Math.atan2(target.y - from.y, target.x - from.x);

    let length = 20;

    let flare = 0;

    let time = 0;

    const hide = show(stage, (g) => drawArrow(g, pos, angle, length, time, head, flare));

    await tween(stage, FLY_MS, (k, dt) => {
      time += dt;

      const next = bezier(from, ctrl, target, k ** 1.25);

      if (next.x !== pos.x || next.y !== pos.y) angle = Math.atan2(next.y - pos.y, next.x - pos.x);

      pos = next;
      length = 30 + easeOutCubic(Math.min(1, k * 3)) * 70;

      const back = { x: pos.x - Math.cos(angle) * length * 0.55, y: pos.y - Math.sin(angle) * length * 0.55 };

      emit(stage, back, { tints: VIOLET, speed: [10, 40], angle: [angle + Math.PI - 0.5, angle + Math.PI + 0.5], life: [0.2, 0.4], scale: [0.45, 0.05], spread: 3 });

      for (let i = 0; i < 3; i++) emit(stage, back, { tints: SULFUR, speed: [20, 90], life: [0.4, 0.8], scale: [0.26, 0.04], spread: 7, gravity: 140, drag: 1.5 });

      if (chance(0.35, dt)) emit(stage, back, { tints: SMOKE, speed: [4, 14], life: [0.6, 1], scale: [0.4, 0.9], spread: 3, additive: false, alpha: 0.35, gravity: -12 });
    });

    const dir = { x: Math.cos(angle), y: Math.sin(angle) };

    const entry = pos;

    await tween(stage, PIERCE_MS, (k, dt) => {
      time += dt;
      pos = { x: entry.x + dir.x * 20 * easeOutCubic(k), y: entry.y + dir.y * 20 * easeOutCubic(k) };
      length = 100 * (1 - k * 0.75);
      flare = k * 1.2;
    });
    hide();

    const big = spec.critical ? 1.4 : 1;

    await Promise.all([
      flash(stage, pos, "#b45cff", 150 * big, 420),
      flash(stage, pos, "#ffffff", 50 * big, 200),
      ring(stage, pos, "#c77dff", 480, 52 * big, 4),
      streakBurst(stage, pos, { colors: ["#ffffff", "#e3c6ff", "#c77dff", "#9b3dff"], count: Math.round(48 * big), angle, cone: 0.7, speed: [260, 680], life: [0.35, 0.75], width: [1.6, 3], gravity: 90, drag: 2, tail: 0.05 }),
      streakBurst(stage, pos, { colors: ["#fff7b0", "#f2e24a", "#ffd25a"], count: Math.round(34 * big), angle: angle + rand(-0.1, 0.1), cone: 1, speed: [200, 520], life: [0.4, 0.9], width: [1.2, 2.2], gravity: 160, drag: 2, tail: 0.045 }),
      streakBurst(stage, pos, { colors: ["#c77dff", "#f2e24a", "#ffffff"], count: 22, speed: [120, 300], life: [0.25, 0.5], width: [1.2, 2] }),
      wait(stage, 500),
    ]);
  });
};
