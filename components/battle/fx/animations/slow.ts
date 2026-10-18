import { clamp01, easeOutCubic, envelope } from "../runtime/easing";
import { arcControl, bezier, type FxPoint, rand } from "../runtime/geometry";
import { playGhost } from "../runtime/ghosts";
import { emit } from "../runtime/primitives";
import { perTarget } from "../runtime/recipes";
import { hourglass } from "../runtime/shapes";
import { animateEl, show, type Stage, tween, wait } from "../runtime/stage";
import { glow, sprite } from "../runtime/texture";
import type { FxAnimation } from "./types";

import { IMPACT_MS } from "@/lib/utils/battle/fx";

const HOLD_MS = 1900;

const MIST = ["#8ea4c4", "#6f86a8", "#b4c6de"];

const SAND = ["#f2dfa8", "#e0c47c"];

const GHOST_FILTER = "grayscale(1) sepia(.4) hue-rotate(180deg) brightness(1.3)";

// The target sways once, sluggishly; its ghosts replay the sway later, so they trail behind it.
const SWAY: Keyframe[] = [{ transform: "none" }, { transform: "translateX(-16px)", offset: 0.45 }, { transform: "translateX(6px)", offset: 0.8 }, { transform: "none" }];

const SWAY_MS = 1500;

async function drift(stage: Stage, from: FxPoint, to: FxPoint) {
  const ctrl = arcControl(from, to, 40);

  const tex = glow("#7f9cc8");

  const core = glow("#ffffff");

  let pos = from;

  const hide = show(stage, (g) => {
    sprite(g, tex, pos.x, pos.y, 0.8);
    sprite(g, core, pos.x, pos.y, 0.18);
  });

  await tween(stage, IMPACT_MS.slow, (k) => {
    pos = bezier(from, ctrl, to, easeOutCubic(k));
    emit(stage, pos, { tints: MIST, speed: [4, 18], life: [0.5, 0.9], scale: [0.3, 0.06], spread: 4, alpha: 0.5 });
  });
  hide();
}

function ripple(g: CanvasRenderingContext2D, at: FxPoint, k: number, phase: number) {
  // A heavy ease: the ring leaps out, then all but stops — time thickening around the target.
  const e = 1 - (1 - k) ** 5;

  const rx = 34 + e * 66;

  g.globalAlpha = (1 - k) * 0.7;
  g.strokeStyle = "#c4d4ea";
  g.lineWidth = 1.6 * (1 - k) + 0.6;
  g.beginPath();

  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * Math.PI * 2;

    const wob = 1 + Math.sin(a * 5 + phase * (1 - e)) * 0.025 * (1 - e);

    g.lineTo(at.x + Math.cos(a) * rx * wob, at.y + Math.sin(a) * rx * 0.48 * wob);
  }

  g.stroke();
}

export const slow: FxAnimation = ({ stage, from, to, targetEls }) =>
  perTarget(stage, to, 0, async (target, i) => {
    await drift(stage, from, target);

    const el = targetEls[i];

    const glass = { x: target.x, y: target.y - 4 };

    const haze = glow("#5a6e90");

    const halo = glow("#9fb8e0");

    const grains: (FxPoint & { vy: number })[] = [];

    let t = 0;

    const hide = show(stage, (g) => {
      const k = t / HOLD_MS;

      const fade = envelope(k, 0.12, 0.25);

      sprite(g, haze, target.x, target.y, 3.4, 1.7, fade * 0.55, false);

      g.globalCompositeOperation = "lighter";
      g.lineWidth = 1;

      // Slow underwater shimmer: horizontal waves crawling through the thickened air.
      for (let w = 0; w < 5; w++) {
        const y = target.y - 26 + w * 13;

        g.globalAlpha = fade * 0.22;
        g.strokeStyle = "#b4c6de";
        g.beginPath();

        for (let x = -70; x <= 70; x += 7) g.lineTo(target.x + x, y + Math.sin(x * 0.07 + t * 0.0016 + w) * 3 * (1 - Math.abs(x) / 90));

        g.stroke();
      }

      for (let r = 0; r < 4; r++) {
        const rk = (t - r * 260) / 1300;

        if (rk > 0 && rk < 1) ripple(g, target, rk, 10 + r);
      }

      const appear = clamp01(k / 0.15);

      const size = 46 * (1.4 - 0.4 * easeOutCubic(appear));

      sprite(g, halo, glass.x, glass.y, 1.5, 1.8, fade * 0.5);
      g.save();
      g.translate(glass.x, glass.y);
      g.rotate(Math.sin(t * 0.002) * 0.08);
      g.globalAlpha = fade;
      g.globalCompositeOperation = "source-over";
      g.shadowColor = "#9fc4ff";
      g.shadowBlur = 8;
      hourglass(g, 0, 0, size, 1 - clamp01((k - 0.1) / 0.8) * 0.8, appear, "#dce8ff", "#f2dfa8");
      g.restore();

      g.globalCompositeOperation = "lighter";
      g.fillStyle = "#f2dfa8";

      for (const p of grains) {
        g.globalAlpha = fade * 0.9;
        g.fillRect(p.x - 0.8, p.y - 0.8, 1.6, 1.6);
      }
    });

    const sway = el ? Promise.all([animateEl(stage, el, SWAY, { duration: SWAY_MS, delay: 150, easing: "ease-in-out" }), ...[1, 2, 3].map((n) => playGhost(stage, el, GHOST_FILTER, SWAY.map((f) => ({ ...f, opacity: 0.7 - n * 0.15 })), { duration: SWAY_MS, delay: 150 + n * 140, easing: "ease-in-out" }))]) : wait(stage, 0);

    const run = tween(stage, HOLD_MS, (k, dt) => {
      t = k * HOLD_MS;

      // Grains slip out of the hourglass and sink slowly, as through water.
      if (k > 0.15 && k < 0.8 && Math.random() < 0.5) grains.push({ x: glass.x + rand(-4, 4), y: glass.y + 26, vy: rand(10, 20) });

      for (const p of grains) p.y += p.vy * dt;

      while (grains.length && grains[0].y > target.y + 40) grains.shift();

      if (k > 0.1 && k < 0.7 && Math.random() < 0.3) emit(stage, { x: target.x + rand(-60, 60), y: target.y + rand(-20, 20) }, { tints: SAND, speed: [2, 8], life: [0.6, 1], scale: [0.12, 0.04], alpha: 0.7 });
    }).then(hide);

    await Promise.all([run, sway]);
  });
