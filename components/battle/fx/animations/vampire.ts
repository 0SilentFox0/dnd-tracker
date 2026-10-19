import { faceOf, halfSize } from "../runtime/anchors";
import { clamp01, easeOutCubic, envelope } from "../runtime/easing";
import { arcControl, bezier, chance, farSide, type FxPoint, rand, wavePoints } from "../runtime/geometry";
import { emit, ring } from "../runtime/primitives";
import { perTarget } from "../runtime/recipes";
import { taperedStroke, twinkle } from "../runtime/shapes";
import { animateEl, schedule, show, tween } from "../runtime/stage";
import { glow, sprite, spritePx } from "../runtime/texture";
import type { FxAnimation } from "./types";

import { ARCHETYPE_FX } from "@/lib/utils/battle/fx";

const FLY_MS = 480;

const FANGS_MS = 620;

const DRINK_MS = ARCHETYPE_FX.vampire.impactMs;

const GULPS = [1250, 1750];

const TOTAL_MS = 2600;

const BLOOD = ["#ff4a4a", "#e01818", "#a00010"];

const MIST = ["#c01020", "#8a0610", "#e03040"];

// Deathly pale while it lasts, flushing red on every gulp.
const PALLOR: Keyframe[] = [
  { filter: "none" },
  { filter: "grayscale(.75) brightness(1.3) contrast(1.05)", offset: 0.12 },
  { filter: "grayscale(.75) brightness(1.3) contrast(1.05)", offset: 0.85 },
  { filter: "none" },
];

interface Stream {
  from: FxPoint;
  phase: number;
}

function bat(g: CanvasRenderingContext2D, x: number, y: number, size: number, flap: number) {
  g.save();
  g.translate(x, y);
  g.fillStyle = "#2a0408";
  g.strokeStyle = "rgba(255,90,90,0.8)";
  g.lineWidth = 0.8;

  for (const side of [-1, 1]) {
    g.save();
    g.scale(side, 1);
    g.rotate(flap * 0.6);
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(size * 0.5, -size * 0.6, size * 1.1, -size * 0.2);
    g.quadraticCurveTo(size * 0.85, -size * 0.05, size * 0.8, size * 0.15);
    g.quadraticCurveTo(size * 0.6, 0, size * 0.5, size * 0.2);
    g.quadraticCurveTo(size * 0.35, size * 0.05, size * 0.2, size * 0.25);
    g.closePath();
    g.fill();
    g.stroke();
    g.restore();
  }

  g.beginPath();
  g.ellipse(0, size * 0.05, size * 0.16, size * 0.26, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#ff3030";

  for (const side of [-1, 1]) {
    g.beginPath();
    g.arc(side * size * 0.06, -size * 0.05, size * 0.04, 0, Math.PI * 2);
    g.fill();
  }

  g.restore();
}

// Two long white fangs hanging from the upper lip at (x, y).
function fangs(g: CanvasRenderingContext2D, x: number, y: number, len: number, gap: number) {
  g.fillStyle = "#fbf6ee";
  g.strokeStyle = "rgba(120,20,30,0.9)";
  g.lineWidth = 0.8;

  for (const side of [-1, 1]) {
    const fx = x + side * gap;

    g.beginPath();
    g.moveTo(fx - len * 0.28, y);
    g.quadraticCurveTo(fx - len * 0.2, y + len * 0.7, fx + side * len * 0.08, y + len);
    g.quadraticCurveTo(fx + len * 0.1, y + len * 0.5, fx + len * 0.28, y);
    g.closePath();
    g.fill();
    g.stroke();
  }
}

export const vampire: FxAnimation = ({ stage, from, to, targetEls }) =>
  perTarget(stage, to, 0, async (target, i) => {
    const el = targetEls[i];

    const { w, h } = halfSize(el);

    const face = faceOf(el, target);

    const mouth = { x: face.x, y: face.y + face.r * 0.42 };

    const side = farSide(target, from, stage.layer.clientWidth);

    const fieldW = stage.layer.clientWidth;

    // Red mist seeping from the wounds of the foes on the far side.
    const streams: Stream[] = [-0.7, 0, 0.7].map((dy, n) => ({ from: { x: Math.max(6, Math.min(fieldW - 6, target.x + side * (w + rand(24, 46)))), y: target.y + dy * h * 1.2 }, phase: n * 2.1 }));

    const ctrl = arcControl(from, face, 50);

    let t = 0;

    const hide = show(stage, (g) => {
      const time = t / 1000;

      // The crimson bat flits to the hero.
      const fly = clamp01(t / FLY_MS);

      if (fly < 1) {
        const p = bezier(from, ctrl, face, easeOutCubic(fly));

        spritePx(g, glow("#a00010"), p.x, p.y, 30, undefined, 0.6);
        g.globalCompositeOperation = "source-over";
        g.globalAlpha = 1;
        bat(g, p.x, p.y, 10, Math.sin(time * 40));
      }

      // Red mist trails pulled in along wavering ribbons to the lips.
      const draw = envelope(clamp01((t - DRINK_MS + 300) / (TOTAL_MS - DRINK_MS)), 0.15, 0.25);

      if (draw > 0) {
        for (const s of streams) {
          const pts = wavePoints(s.from, mouth, 16, 7, time * 7 + s.phase, 1.2);

          g.globalCompositeOperation = "lighter";
          g.globalAlpha = draw * 0.28;
          taperedStroke(g, [...pts].reverse(), "#a00010", 9, -0.6, 2, pts.length);
          g.globalAlpha = draw * 0.45;
          taperedStroke(g, [...pts].reverse(), "#e02030", 2.2, -0.6, 0.6, pts.length);

          for (let n = 0; n < 4; n++) {
            const u = (time * 1.4 + n / 4 + s.phase) % 1;

            const at = pts[Math.min(pts.length - 1, Math.floor(u * (pts.length - 1)))];

            sprite(g, glow("#ff3030"), at.x, at.y, 0.22 + u * 0.12, undefined, draw);
          }
        }
      }

      // Each gulp flushes the hero's face with blood.
      const gulp = Math.max(...GULPS.map((at) => (t >= at ? Math.max(0, 1 - (t - at) / 450) : 0)));

      if (gulp > 0) spritePx(g, glow("#e01818"), face.x, face.y, face.r * 4.5, undefined, 0.7 * gulp);

      // Fangs lengthen, catching the light.
      const grow = easeOutCubic(clamp01((t - FANGS_MS) / 350)) * (1 - clamp01((t - TOTAL_MS + 350) / 350));

      if (grow > 0) {
        g.globalCompositeOperation = "source-over";
        g.globalAlpha = Math.min(1, grow * 2);
        fangs(g, mouth.x, mouth.y - 1, Math.max(7, face.r * 0.62) * grow, Math.max(3, face.r * 0.24));

        const glint = envelope(clamp01((t - FANGS_MS - 300) / 400), 0.3, 0.5);

        twinkle(g, mouth.x + Math.max(3, face.r * 0.22), mouth.y + face.r * 0.35 * grow, 6 * glint, "#ffffff", glint);
      }

      g.globalAlpha = 1;
    });

    schedule(stage, FLY_MS, () => {
      for (let n = 0; n < 18; n++) emit(stage, face, { tints: MIST, speed: [20, 70], life: [0.5, 0.9], scale: [0.4, 0.8], drag: 2, additive: false, alpha: 0.45 });

      if (el) void animateEl(stage, el, PALLOR, { duration: TOTAL_MS - FLY_MS, easing: "ease-in-out" });
    });

    for (const at of GULPS) {
      schedule(stage, at, () => {
        void ring(stage, mouth, "#ff3030", 500, Math.max(18, face.r * 1.2), 2.5);

        for (let n = 0; n < 8; n++) emit(stage, mouth, { tints: BLOOD, speed: [20, 60], life: [0.3, 0.6], scale: [0.25, 0.05] });
      });
    }

    await tween(stage, TOTAL_MS, (k, dt) => {
      t = k * TOTAL_MS;

      if (t > DRINK_MS && t < TOTAL_MS - 600 && chance(0.5, dt)) {
        const s = streams[Math.floor(rand(0, streams.length))].from;

        emit(stage, { x: s.x + rand(-6, 6), y: s.y + rand(-6, 6) }, { tints: MIST, speed: [5, 15], life: [0.5, 0.9], scale: [0.4, 0.7], drag: 1, additive: false, alpha: 0.3 });
      }
    }).then(() => void hide());
  });
