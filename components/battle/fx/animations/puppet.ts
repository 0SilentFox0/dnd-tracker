import { faceOf, halfSize } from "../runtime/anchors";
import { clamp01, easeOutCubic } from "../runtime/easing";
import { arcControl, bezier, type FxPoint } from "../runtime/geometry";
import { motionPath } from "../runtime/motion";
import { emit } from "../runtime/primitives";
import { perTarget } from "../runtime/recipes";
import { twinkle } from "../runtime/shapes";
import { animateEl, schedule, show, type Stage, tween } from "../runtime/stage";
import { glow, sprite } from "../runtime/texture";
import type { FxAnimation } from "./types";

import { ARCHETYPE_FX } from "@/lib/utils/battle/fx";

const BAR_MS = ARCHETYPE_FX.puppet.impactMs;

const DROP_MS = 260;

const TOTAL_MS = 2700;

const CUT_MS = 2250;

const SILVER = ["#ffffff", "#e8e8f8", "#c8b8ff"];

// [time after the strings land, dx, dy, deg]: snap into a pose, hold it, snap into the next.
const POSES: [number, number, number, number][] = [[0, 0, 0, 0], [60, 4, -6, 3], [260, 4, -6, 3], [310, -4, -3, -3], [520, -4, -3, -3], [570, 2, -8, 1], [760, 2, -8, 1], [810, -3, -1, -2], [1000, -3, -1, -2], [1080, 0, 0, 0]];

async function thread(stage: Stage, from: FxPoint, to: FxPoint) {
  const ctrl = arcControl(from, to, 50);

  const trail: FxPoint[] = [];

  const hide = show(stage, (g) => {
    g.globalCompositeOperation = "lighter";
    g.strokeStyle = "#e8e8f8";
    g.lineWidth = 1.2;
    g.globalAlpha = 0.9;
    g.beginPath();

    for (const p of trail) g.lineTo(p.x, p.y);

    g.stroke();
    g.globalAlpha = 1;

    if (trail.length) sprite(g, glow("#c8b8ff"), trail[trail.length - 1].x, trail[trail.length - 1].y, 0.4);
  });

  await tween(stage, BAR_MS - 150, (k) => trail.push(bezier(from, ctrl, to, easeOutCubic(k))));
  hide();
}

function controlBar(g: CanvasRenderingContext2D, len: number) {
  const wood = g.createLinearGradient(0, -4, 0, 4);

  wood.addColorStop(0, "#5a3e2a");
  wood.addColorStop(1, "#24160c");
  g.fillStyle = wood;
  g.strokeStyle = "#0a0604";
  g.lineWidth = 1;
  g.beginPath();
  g.roundRect(-len / 2, -3, len, 6, 3);
  g.fill();
  g.stroke();
  g.beginPath();
  g.roundRect(-3, -len * 0.22, 6, len * 0.44, 3);
  g.fill();
  g.stroke();
}

export const puppet: FxAnimation = ({ stage, from, to, targetEls }) =>
  perTarget(stage, to, 0, async (target, i) => {
    const el = targetEls[i];

    const { w, h } = halfSize(el);

    const face = faceOf(el, target);

    const len = Math.max(54, Math.min(110, w * 1.1));

    const bar = { x: target.x + (face.x - target.x) * 0.3, y: Math.max(16, target.y - h - 30) };

    await thread(stage, from, bar);

    // Where each string bites: neck, wrists and a knee, read across the row.
    const holds = [
      { x: face.x - target.x, y: -h * 0.15 },
      { x: -w * 0.15, y: h * 0.45 },
      { x: w * 0.35, y: -h * 0.25 },
      { x: w * 0.7, y: h * 0.35 },
    ].sort((a, b) => a.x - b.x);

    const ends = [-0.5, -0.12, 0.12, 0.5];

    const jerk = motionPath(POSES.map(([at, x, y, rot]) => ({ at, x, y, rot })));

    const eyes = glow("#b070ff");

    let t = 0;

    const hide = show(stage, (g) => {
      const cut = clamp01((t - CUT_MS) / 400);

      const m = jerk.sample(t - BAR_MS - DROP_MS);

      const tilt = m.rot * 0.05 + m.x * 0.01;

      const appear = easeOutCubic(clamp01((t - BAR_MS + 200) / 250));

      // The puppeteer's control bar hanging over the foe, tilting as it works the strings.
      sprite(g, glow("#7a3ab0"), bar.x, bar.y, (len * 1.8) / 64, 40 / 64, appear * (1 - cut) * 0.7);
      g.save();
      g.translate(bar.x, bar.y - cut * 12);
      g.rotate(tilt);
      g.scale(appear, appear);
      g.globalAlpha = 1 - cut;
      g.globalCompositeOperation = "source-over";
      controlBar(g, len);
      g.restore();

      const drop = clamp01((t - BAR_MS) / DROP_MS);

      g.globalCompositeOperation = "lighter";
      g.lineCap = "round";

      holds.forEach((hold, n) => {
        const top = { x: bar.x + Math.cos(tilt) * ends[n] * len, y: bar.y + Math.sin(tilt) * ends[n] * len };

        const end = { x: target.x + m.x + hold.x, y: target.y + m.y + hold.y };

        const tip = { x: top.x + (end.x - top.x) * drop, y: top.y + (end.y - top.y) * drop };

        for (const [color, width, alpha] of [["#9a70ff", 3, 0.35], ["#f4f0ff", 1, 0.95]] as const) {
          g.globalAlpha = alpha * (1 - cut);
          g.strokeStyle = color;
          g.lineWidth = width;
          g.beginPath();
          g.moveTo(top.x, top.y);
          g.lineTo(tip.x, tip.y);
          g.stroke();
        }

        if (drop >= 1) sprite(g, glow("#c8b8ff"), end.x, end.y, 0.18, undefined, 1 - cut);
      });

      // Its eyes take on the puppeteer's violet.
      const seized = clamp01((t - BAR_MS - DROP_MS - 200) / 300) * (1 - cut);

      if (seized > 0) {
        for (const dx of [-0.3, 0.3]) sprite(g, eyes, face.x + m.x + dx * face.r, face.y + m.y - face.r * 0.12, 0.22, undefined, seized);
      }

      g.globalAlpha = 1;
    });

    const dance = animateEl(stage, el, jerk.keyframes, { duration: jerk.duration, delay: DROP_MS });

    for (const [at] of POSES.filter((_, n) => n % 2 === 1)) {
      schedule(stage, DROP_MS + at, () => {
        const m = jerk.sample(at + 60);

        for (const hold of holds) emit(stage, { x: target.x + m.x + hold.x, y: target.y + m.y + hold.y }, { tints: SILVER, speed: [20, 60], life: [0.2, 0.35], scale: [0.2, 0.04] });
      });
    }

    const run = tween(stage, TOTAL_MS - BAR_MS, (k) => {
      t = BAR_MS + k * (TOTAL_MS - BAR_MS);
    }).then(hide);

    schedule(stage, CUT_MS - BAR_MS, () => {
      for (const hold of holds) void twinkleAt(stage, { x: target.x + hold.x, y: target.y + hold.y });
    });

    await Promise.all([run, dance]);
  });

function twinkleAt(stage: Stage, at: FxPoint) {
  let k = 0;

  const hide = show(stage, (g) => twinkle(g, at.x, at.y, 7 * Math.sin(k * Math.PI), "#f4f0ff", 1));

  return tween(stage, 300, (v) => (k = v)).then(hide);
}
