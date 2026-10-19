import { faceOf, halfSize } from "../runtime/anchors";
import { clamp01, easeOutCubic } from "../runtime/easing";
import { chance, type FxPoint, rand } from "../runtime/geometry";
import { emit } from "../runtime/primitives";
import { perTarget } from "../runtime/recipes";
import { animateEl, show, tween, wait } from "../runtime/stage";
import { glow, sprite, spritePx } from "../runtime/texture";
import type { FxAnimation } from "./types";

import { IMPACT_MS } from "@/lib/utils/battle/fx";

const ARRIVE_MS = IMPACT_MS.pestilence;

const TOTAL_MS = 2700;

const SCATTER_MS = 2050;

const MIASMA = ["#3a5a1a", "#2a4012", "#4a6a20"];

interface Fly {
  delay: number;
  ctrl: FxPoint;
  orbit: number;
  speed: number;
  phase: number;
  out: number;
}

interface Blister {
  x: number;
  y: number;
  r: number;
  born: number;
}

function fly(g: CanvasRenderingContext2D, x: number, y: number, heading: number, flap: number) {
  g.save();
  g.translate(x, y);
  g.rotate(heading);
  g.globalAlpha = 1;
  g.globalCompositeOperation = "source-over";
  g.fillStyle = `rgba(210,230,200,${0.35 + flap * 0.3})`;

  for (const side of [-1, 1]) {
    g.beginPath();
    g.ellipse(-0.6, side * (1.6 + flap * 0.6), 2, 1 + flap * 0.4, side * 0.6, 0, Math.PI * 2);
    g.fill();
  }

  g.fillStyle = "#0e1408";
  g.beginPath();
  g.ellipse(0, 0, 2.4, 1.4, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#4a6a1a";
  g.beginPath();
  g.arc(2.2, 0, 1, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

// Cartoon stink: a wavy line curling up off the foe.
function stench(g: CanvasRenderingContext2D, x: number, y: number, k: number, phase: number) {
  g.globalAlpha = Math.sin(k * Math.PI) * 0.75;
  g.beginPath();

  for (let n = 0; n <= 10; n++) {
    const u = n / 10;

    g.lineTo(x + Math.sin(u * 7 + phase + k * 6) * 4, y - k * 22 - u * 18);
  }

  g.stroke();
}

export const pestilence: FxAnimation = ({ stage, from, to, targetEls }) =>
  perTarget(stage, to, 0, async (target, i) => {
    const el = targetEls[i];

    const { w, h } = halfSize(el);

    const face = faceOf(el, target);

    const fr = Math.max(14, face.r);

    const swarm: Fly[] = Array.from({ length: 26 }, () => ({ delay: rand(0, 260), ctrl: { x: (from.x + face.x) / 2 + rand(-50, 50), y: Math.min(from.y, face.y) - rand(10, 70) }, orbit: fr * rand(0.6, 1.5), speed: rand(5, 9) * (Math.random() < 0.5 ? 1 : -1), phase: rand(0, 6), out: rand(0, Math.PI * 2) }));

    const blisters: Blister[] = Array.from({ length: 9 }, (_, n) => ({ x: target.x + rand(-w * 0.85, w * 0.85), y: target.y + rand(-h * 0.6, h * 0.6), r: rand(2.2, 3.6), born: ARRIVE_MS + 120 + n * 90 }));

    const fumes = Array.from({ length: 4 }, (_, n) => ({ x: target.x + (n / 3 - 0.5) * w * 1.2, phase: rand(0, 6), born: ARRIVE_MS + 300 + n * 220 }));

    const sick = glow("#7ac040");

    let t = 0;

    const posOf = (f: Fly, time: number): FxPoint => {
      const local = time - f.delay;

      const travel = ARRIVE_MS - 260;

      const a = f.phase + (local / 1000) * f.speed;

      const buzz = { x: face.x + Math.cos(a) * f.orbit + Math.sin(local / 23 + f.phase) * 2.5, y: face.y + Math.sin(a * 1.3) * f.orbit * 0.7 + Math.cos(local / 19 + f.phase) * 2.5 };

      if (local < travel) {
        const k = clamp01(local / travel);

        const u = 1 - k;

        const p = { x: u * u * from.x + 2 * u * k * f.ctrl.x + k * k * buzz.x, y: u * u * from.y + 2 * u * k * f.ctrl.y + k * k * buzz.y };

        return { x: p.x + Math.sin(local / 30 + f.phase) * 4, y: p.y + Math.cos(local / 27 + f.phase) * 4 };
      }

      const gone = easeOutCubic(clamp01((time - SCATTER_MS) / 600)) * 120;

      return { x: buzz.x + Math.cos(f.out) * gone, y: buzz.y + Math.sin(f.out) * gone * 0.7 };
    };

    const hide = show(stage, (g) => {
      const there = clamp01((t - ARRIVE_MS + 200) / 300) * (1 - clamp01((t - SCATTER_MS) / 500));

      // The rot of a crypt hanging round the face.
      spritePx(g, glow("#1e2c0c"), face.x, face.y, fr * 4.2, fr * 3.2, there * 0.7, false);
      sprite(g, sick, face.x, face.y, (fr * 3.4) / 64, undefined, there * 0.35);

      g.globalCompositeOperation = "source-over";

      for (const b of blisters) {
        const k = clamp01((t - b.born) / 220);

        if (k <= 0) continue;

        const r = b.r * (k < 1 ? 1.3 * easeOutCubic(k) : 1) * (1 - clamp01((t - TOTAL_MS + 400) / 400));

        g.globalAlpha = 1;
        g.fillStyle = "#4a6418";
        g.beginPath();
        g.arc(b.x, b.y, r + 1.4, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "#0e0a06";
        g.beginPath();
        g.arc(b.x, b.y, r, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "rgba(220,240,180,0.7)";
        g.fillRect(b.x - r * 0.45, b.y - r * 0.55, 1, 1);
      }

      g.strokeStyle = "#9acd50";
      g.lineWidth = 1.6;
      g.lineCap = "round";

      for (const f of fumes) {
        const k = clamp01((t - f.born) / 1100);

        if (k > 0 && k < 1) stench(g, f.x, target.y - h * 0.3, k, f.phase);
      }

      g.globalAlpha = 1;

      for (const f of swarm) {
        if (t < f.delay) continue;

        const now = posOf(f, t);

        const prev = posOf(f, t - 16);

        sprite(g, sick, now.x, now.y, 0.14, undefined, 0.3);
        fly(g, now.x, now.y, Math.atan2(now.y - prev.y, now.x - prev.x), 0.5 + Math.sin(t * 1.3 + f.phase * 10) * 0.5);
      }
    });

    const sicken = el
      ? wait(stage, ARRIVE_MS).then(() =>
          animateEl(stage, el, [{ filter: "none" }, { filter: "saturate(.7) sepia(.35) hue-rotate(35deg) brightness(.85)", offset: 0.25 }, { filter: "saturate(.7) sepia(.35) hue-rotate(35deg) brightness(.85)", offset: 0.75 }, { filter: "none" }], { duration: TOTAL_MS - ARRIVE_MS }),
        )
      : wait(stage, 0);

    const run = tween(stage, TOTAL_MS, (k, dt) => {
      t = k * TOTAL_MS;

      if (t > ARRIVE_MS && t < SCATTER_MS && chance(0.5, dt)) emit(stage, { x: face.x + rand(-fr, fr), y: face.y + rand(-fr * 0.6, fr * 0.6) }, { tints: MIASMA, speed: [6, 18], angle: [-Math.PI * 0.7, -Math.PI * 0.3], life: [0.8, 1.2], scale: [0.4, 0.9], additive: false, alpha: 0.4, gravity: -12 });
    }).then(hide);

    await Promise.all([run, sicken]);
  });
