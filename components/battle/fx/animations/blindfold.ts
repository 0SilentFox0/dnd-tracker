import { faceOf } from "../runtime/anchors";
import { clamp01, easeOutCubic } from "../runtime/easing";
import { arcControl, bezier, chance, type FxPoint, rand } from "../runtime/geometry";
import { motionPath } from "../runtime/motion";
import { emit } from "../runtime/primitives";
import { perTarget } from "../runtime/recipes";
import { animateEl, timeline } from "../runtime/stage";
import { glow, sprite, spritePx } from "../runtime/texture";
import type { FxAnimation } from "./types";

import { ARCHETYPE_FX } from "@/lib/utils/battle/fx";

const ARRIVE_MS = ARCHETYPE_FX.blindfold.impactMs;

const WRAP_MS = 420;

const TOTAL_MS = 2600;

const LIFT_MS = 2150;

const HAZE = ["#1a0c26", "#26103a", "#120818"];

interface Laugh {
  x: number;
  y: number;
  born: number;
  size: number;
}

function velvet(g: CanvasRenderingContext2D, y0: number, y1: number) {
  const grad = g.createLinearGradient(0, y0, 0, y1);

  grad.addColorStop(0, "#2a1640");
  grad.addColorStop(0.35, "#0c0612");
  grad.addColorStop(0.7, "#120a1c");
  grad.addColorStop(1, "#3a1e58");

  return grad;
}

export const blindfold: FxAnimation = ({ stage, from, to, targetEls }) =>
  perTarget(stage, to, 0, async (target, i) => {
    const el = targetEls[i];

    const face = faceOf(el, target);

    const fr = Math.max(14, face.r);

    const eyes = { x: face.x, y: face.y - fr * 0.15 };

    const ctrl = arcControl(from, eyes, 70);

    const trail: FxPoint[] = [];

    const laughs: Laugh[] = [];

    const sheen = glow("#6a3aa0");

    const band = velvet(stage.g, -fr * 0.3, fr * 0.3);

    const run = timeline(
      stage,
      TOTAL_MS,
      (g, t) => {
        const lift = clamp01((t - LIFT_MS) / 400);

        spritePx(g, glow("#120818"), eyes.x, eyes.y, fr * 4, fr * 3, 0.75 * clamp01((t - ARRIVE_MS) / 300) * (1 - lift), false);
        g.globalAlpha = 1;

        // The ribbon in flight: a rippling black strip trailing behind its head.
        if (t < ARRIVE_MS && trail.length > 1) {
          g.globalCompositeOperation = "source-over";
          g.lineCap = "round";

          for (const [color, width] of [["#8a5ac8", 12], ["#0c0612", 8]] as const) {
            g.strokeStyle = color;
            g.lineWidth = width;
            g.beginPath();
            trail.forEach((p, n) => g.lineTo(p.x, p.y + Math.sin(n * 0.9 + t / 40) * 4));
            g.stroke();
          }
        }

        // It whips round the head, then settles tight over the eyes.
        const wrap = clamp01((t - ARRIVE_MS) / WRAP_MS);

        if (wrap > 0 && wrap < 1) {
          const sweep = easeOutCubic(wrap) * Math.PI * 3;

          const rx = fr * (1.5 - wrap * 0.35);

          const ry = fr * 0.4;

          g.globalCompositeOperation = "source-over";
          g.lineCap = "round";

          for (const [color, width] of [["#8a5ac8", 12], ["#0c0612", 8.5]] as const) {
            g.strokeStyle = color;
            g.lineWidth = width;
            g.beginPath();

            for (let n = 0; n <= 30; n++) {
              const a = sweep - (n / 30) * Math.min(sweep, Math.PI * 1.4);

              g.lineTo(eyes.x + Math.cos(a) * rx, eyes.y + Math.sin(a) * ry);
            }

            g.stroke();
          }
        }

        if (wrap >= 1 && lift < 1) {
          const tight = easeOutCubic(clamp01((t - ARRIVE_MS - WRAP_MS) / 160));

          const hw = fr * 1.12;

          const hh = fr * (0.5 - tight * 0.12);

          g.save();
          g.translate(eyes.x, eyes.y);
          g.globalAlpha = 1 - lift;
          g.globalCompositeOperation = "source-over";
          g.fillStyle = band;
          g.beginPath();
          g.moveTo(-hw, -hh);
          g.quadraticCurveTo(0, -hh - fr * 0.08, hw, -hh);
          g.lineTo(hw, hh);
          g.quadraticCurveTo(0, hh + fr * 0.08, -hw, hh);
          g.closePath();
          g.fill();
          g.strokeStyle = "#8a5ac8";
          g.lineWidth = 1.5;
          g.beginPath();
          g.moveTo(-hw, -hh);
          g.quadraticCurveTo(0, -hh - fr * 0.08, hw, -hh);
          g.moveTo(-hw, hh);
          g.quadraticCurveTo(0, hh + fr * 0.08, hw, hh);
          g.stroke();

          // The knot and two tails fluttering off the side of the head.
          g.fillStyle = "#0c0612";

          for (const [dy, len, ph] of [[-0.05, 0.85, 0], [0.12, 0.7, 1.4]] as const) {
            const flap = Math.sin(t / 110 + ph) * fr * 0.15;

            g.beginPath();
            g.moveTo(hw * 0.95, dy * fr - fr * 0.1);
            g.quadraticCurveTo(hw + fr * len * 0.5, dy * fr + flap, hw + fr * len, dy * fr + fr * 0.25 + flap * 1.4);
            g.lineTo(hw + fr * len * 0.85, dy * fr + fr * 0.4 + flap);
            g.quadraticCurveTo(hw + fr * len * 0.45, dy * fr + fr * 0.15 + flap * 0.6, hw * 0.95, dy * fr + fr * 0.12);
            g.closePath();
            g.fill();
          }

          g.beginPath();
          g.ellipse(hw * 0.98, 0, fr * 0.16, fr * 0.2, 0, 0, Math.PI * 2);
          g.fill();
          g.restore();

          // A velvet sheen sliding along the band.
          sprite(g, sheen, eyes.x + Math.sin(t / 300) * hw * 0.7, eyes.y, (fr * 1.1) / 64, (fr * 0.35) / 64, 0.5 * (1 - lift));
        }

        // The quiet laughter of the dark: thin violet grins drifting up round the head.
        g.globalCompositeOperation = "lighter";
        g.lineCap = "round";
        g.strokeStyle = "#a070e0";

        for (const l of laughs) {
          const k = clamp01((t - l.born) / 800);

          if (k >= 1) continue;

          g.globalAlpha = Math.sin(k * Math.PI) * 0.8;
          g.lineWidth = 1.6;
          g.beginPath();
          g.arc(l.x, l.y - k * 14, l.size, Math.PI * 0.15, Math.PI * 0.85);
          g.stroke();
        }

        g.globalAlpha = 1;
      },
      (t, dt) => {
        if (t < ARRIVE_MS) {
          trail.unshift(bezier(from, ctrl, eyes, (t / ARRIVE_MS) ** 1.2));

          if (trail.length > 22) trail.pop();
        }

        if (t > next && t < LIFT_MS - 200) {
          const a = rand(-Math.PI, 0);

          laughs.push({ x: eyes.x + Math.cos(a) * fr * rand(1.4, 2), y: eyes.y + Math.sin(a) * fr * rand(0.8, 1.3), born: t, size: rand(4, 6) });
          next = t + 260;
        }

        if (t > ARRIVE_MS && t < LIFT_MS && chance(0.4, dt)) emit(stage, { x: eyes.x + rand(-fr * 1.4, fr * 1.4), y: eyes.y + rand(-fr * 0.5, fr * 0.5) }, { tints: HAZE, speed: [5, 18], life: [0.7, 1.1], scale: [0.4, 0.9], additive: false, alpha: 0.5, gravity: -10 });
      },
    );

    // Blind, it flails at nothing.
    const flail = motionPath([
      { at: 0, x: 0, y: 0 },
      { at: 200, x: -3, y: -1, rot: -1.5 },
      { at: 380, x: 3, y: 0, rot: 1.5 },
      { at: 520, x: -2, y: 1, rot: -1 },
      { at: 820, x: 0, y: 0 },
      { at: 1000, x: 3, y: -1, rot: 1.5 },
      { at: 1150, x: -2, y: 0, rot: -1 },
      { at: 1350, x: 0, y: 0 },
    ]);

    const darkened = Promise.all([
      animateEl(stage, el, flail.keyframes, { duration: flail.duration, delay: ARRIVE_MS + WRAP_MS, easing: "ease-in-out" }),
      animateEl(stage, el, [{ filter: "none" }, { filter: "brightness(.55) contrast(1.1)", offset: 0.15 }, { filter: "brightness(.55) contrast(1.1)", offset: 0.8 }, { filter: "none" }], { duration: TOTAL_MS - ARRIVE_MS - WRAP_MS, delay: ARRIVE_MS + WRAP_MS }),
    ]);

    let next = ARRIVE_MS + WRAP_MS;

    await Promise.all([run, darkened]);
  });
