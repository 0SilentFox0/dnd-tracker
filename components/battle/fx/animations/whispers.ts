import { faceOf } from "../runtime/anchors";
import { clamp01, easeOutCubic, envelope } from "../runtime/easing";
import { type FxPoint, pick, rand } from "../runtime/geometry";
import { motionPath } from "../runtime/motion";
import { perTarget } from "../runtime/recipes";
import { animateEl, show, tween, wait } from "../runtime/stage";
import { glow, sprite } from "../runtime/texture";
import type { FxAnimation } from "./types";

import { IMPACT_MS } from "@/lib/utils/battle/fx";

const ARRIVE_MS = IMPACT_MS.whispers;

const TOTAL_MS = 2500;

const QUIET_MS = 2050;

const VOICES = ["#c8b0ff", "#9ae6e0", "#e0c8ff"];

interface Orbit {
  tilt: number;
  rx: number;
  ry: number;
  speed: number;
  phase: number;
  tint: string;
}

interface Call {
  x: number;
  y: number;
  angle: number;
  born: number;
  mark: boolean;
}

export const whispers: FxAnimation = ({ stage, to, targetEls }) =>
  perTarget(stage, to, 0, async (target, i) => {
    const el = targetEls[i];

    const face = faceOf(el, target);

    const fr = Math.max(14, face.r);

    const head = { x: face.x, y: face.y - fr * 0.1 };

    // Each voice comes from a different side of the field and joins the swirl round the head.
    const voices: (Orbit & { from: FxPoint })[] = Array.from({ length: 6 }, (_, n) => {
      const a = (n / 6) * Math.PI * 2 + rand(-0.3, 0.3);

      return { tilt: rand(-0.6, 0.6), rx: fr * rand(1.4, 2), ry: fr * rand(0.45, 0.7), speed: (n % 2 ? 1 : -1) * rand(4, 6.5), phase: rand(0, 6), tint: pick(VOICES), from: { x: head.x + Math.cos(a) * 130, y: head.y + Math.sin(a) * 80 } };
    });

    const calls: Call[] = [];

    const wisp = glow("#b090ff");

    const white = glow("#ffffff");

    let t = 0;

    const posOf = (o: Orbit, time: number): FxPoint => {
      const a = o.phase + (time / 1000) * o.speed;

      const x = Math.cos(a) * o.rx;

      const y = Math.sin(a) * o.ry;

      return { x: head.x + x * Math.cos(o.tilt) - y * Math.sin(o.tilt), y: head.y + x * Math.sin(o.tilt) + y * Math.cos(o.tilt) };
    };

    const hide = show(stage, (g) => {
      const quiet = 1 - clamp01((t - QUIET_MS) / 400);

      const join = easeOutCubic(clamp01(t / ARRIVE_MS));

      // Comet-like voices with fading tails circling the head.
      g.globalCompositeOperation = "lighter";
      g.lineCap = "round";

      for (const o of voices) {
        const trail = Array.from({ length: 9 }, (_, n) => {
          const p = posOf(o, t - n * 30);

          return { x: o.from.x + (p.x - o.from.x) * join, y: o.from.y + (p.y - o.from.y) * join };
        });

        g.strokeStyle = o.tint;

        for (let n = 0; n < trail.length - 1; n++) {
          g.globalAlpha = (1 - n / trail.length) * 0.8 * quiet;
          g.lineWidth = 2.6 * (1 - n / trail.length) + 0.4;
          g.beginPath();
          g.moveTo(trail[n].x, trail[n].y);
          g.lineTo(trail[n + 1].x, trail[n + 1].y);
          g.stroke();
        }

        sprite(g, glow(o.tint), trail[0].x, trail[0].y, 0.16, undefined, 0.7 * quiet);
        sprite(g, white, trail[0].x, trail[0].y, 0.06, undefined, quiet);
      }

      // A slow spiral turning over the head: the thoughts going round and round.
      const spin = envelope(clamp01((t - ARRIVE_MS + 150) / (TOTAL_MS - ARRIVE_MS)), 0.15, 0.2);

      if (spin > 0) {
        g.save();
        g.translate(head.x, head.y - fr * 1.25);
        g.rotate(-t / 260);
        g.scale(1, 0.55);
        g.globalCompositeOperation = "lighter";
        g.globalAlpha = spin * 0.9;
        g.strokeStyle = "#c8a8ff";
        g.lineWidth = 2;
        g.lineCap = "round";
        g.beginPath();

        for (let n = 0; n <= 40; n++) {
          const a = (n / 40) * Math.PI * 5;

          const rad = (n / 40) * fr * 0.85;

          g.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
        }

        g.stroke();
        g.restore();
        sprite(g, wisp, head.x, head.y - fr * 1.25, (fr * 2.4) / 64, (fr * 1.4) / 64, spin * 0.35);
      }

      // Every voice calls a different way: arrows and question marks pop round the head.
      g.globalCompositeOperation = "source-over";

      for (const c of calls) {
        const k = clamp01((t - c.born) / 520);

        if (k >= 1) continue;

        const drift = easeOutCubic(k) * 10;

        const x = c.x + Math.cos(c.angle) * drift;

        const y = c.y + Math.sin(c.angle) * drift;

        g.globalAlpha = Math.sin(k * Math.PI) * quiet;
        g.fillStyle = "#e8dcff";
        g.strokeStyle = "#e8dcff";

        if (c.mark) {
          g.font = `700 ${Math.round(fr * 0.75)}px Georgia, serif`;
          g.textAlign = "center";
          g.textBaseline = "middle";
          g.shadowColor = "#8a5aff";
          g.shadowBlur = 6;
          g.fillText("?", x, y);
          g.shadowBlur = 0;
          continue;
        }

        g.save();
        g.translate(x, y);
        g.rotate(c.angle);
        g.lineWidth = 2;
        g.lineCap = "round";
        g.lineJoin = "round";
        g.beginPath();
        g.moveTo(-4, -5);
        g.lineTo(3, 0);
        g.lineTo(-4, 5);
        g.stroke();
        g.restore();
      }

      g.globalAlpha = 1;
    });

    // The foe freezes with its weapon up and keeps glancing from side to side.
    const glance = motionPath([
      { at: 0, x: 0, y: 0 },
      { at: 120, x: -4, y: 0, rot: -2 },
      { at: 420, x: -4, y: 0, rot: -2 },
      { at: 520, x: 4, y: -1, rot: 2 },
      { at: 820, x: 4, y: -1, rot: 2 },
      { at: 900, x: -2, y: 0, rot: -1 },
      { at: 1050, x: 3, y: 0, rot: 1.5 },
      { at: 1350, x: 3, y: 0, rot: 1.5 },
      { at: 1500, x: 0, y: 0 },
    ]);

    const lost = el
      ? wait(stage, ARRIVE_MS).then(() =>
          Promise.all([
            animateEl(stage, el, glance.keyframes, { duration: glance.duration, easing: "ease-in-out" }),
            animateEl(stage, el, [{ filter: "none" }, { filter: "saturate(.6) brightness(.9) hue-rotate(20deg)", offset: 0.2 }, { filter: "saturate(.6) brightness(.9) hue-rotate(20deg)", offset: 0.8 }, { filter: "none" }], { duration: TOTAL_MS - ARRIVE_MS }),
          ]),
        )
      : wait(stage, 0);

    let next = ARRIVE_MS;

    const run = tween(stage, TOTAL_MS, (k) => {
      t = k * TOTAL_MS;

      if (t > next && t < QUIET_MS - 300) {
        const a = rand(0, Math.PI * 2);

        calls.push({ x: head.x + Math.cos(a) * fr * rand(1.1, 1.7), y: head.y + Math.sin(a) * fr * rand(0.8, 1.2), angle: a + rand(-0.4, 0.4), born: t, mark: calls.length % 3 === 1 });
        next = t + 110;
      }
    }).then(hide);

    await Promise.all([run, lost]);
  });
