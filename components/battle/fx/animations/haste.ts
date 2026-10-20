import type { FxAnimation } from "./types";

import { clamp01, easeOutCubic, envelope } from "@/components/battle/fx/runtime/easing";
import { arcControl, bezier, chance, type FxPoint, rand } from "@/components/battle/fx/runtime/geometry";
import { playGhost } from "@/components/battle/fx/runtime/ghosts";
import { emit } from "@/components/battle/fx/runtime/primitives";
import { perTarget } from "@/components/battle/fx/runtime/recipes";
import { feather } from "@/components/battle/fx/runtime/shapes";
import { animateEl, progress, show, type Stage, tween, wait } from "@/components/battle/fx/runtime/stage";
import { glow, sprite } from "@/components/battle/fx/runtime/texture";
import { ARCHETYPE_FX } from "@/lib/utils/battle/fx";

const WHIRL_MS = 1300;

const DASH_AT = 380;

const WIND = ["#ffffff", "#e6fbff", "#b8e8f5"];

const GHOST_FILTER = "saturate(0) brightness(1.6) drop-shadow(0 0 6px #b8e8f5)";

interface Feather {
  a: number;
  speed: number;
  h: number;
  len: number;
  spin: number;
  rot: number;
  // Set when the whirl lets it go: it flies off along its tangent.
  free?: { x: number; y: number; vx: number; vy: number };
}

async function gust(stage: Stage, from: FxPoint, to: FxPoint) {
  const ctrl = arcControl(from, to, 30);

  const lines = Array.from({ length: 7 }, () => ({ off: rand(-14, 14), delay: rand(0, 0.25), len: rand(0.18, 0.32) }));

  await progress(stage, ARCHETYPE_FX.haste.impactMs, (g, k) => {
    g.globalCompositeOperation = "lighter";
    g.lineCap = "round";

    for (const l of lines) {
      const head = clamp01((k - l.delay) / (1 - l.delay)) * 1.15;

      const tail = head - l.len;

      if (head <= 0 || tail >= 1) continue;

      g.globalAlpha = 0.8 * (1 - clamp01(tail));
      g.strokeStyle = "#e6fbff";
      g.lineWidth = 2;
      g.beginPath();

      for (let s = 0; s <= 8; s++) {
        const u = clamp01(tail + ((head - tail) * s) / 8);

        const p = bezier(from, ctrl, to, u);

        g.lineTo(p.x, p.y + l.off * Math.sin(u * Math.PI));
      }

      g.stroke();
    }
  });
}

// Motion lines streaming back from the hero as it surges forward.
function speedLines(stage: Stage, target: FxPoint, dir: number) {
  const lines = Array.from({ length: 12 }, () => ({ y: target.y + rand(-28, 28), x0: target.x + dir * rand(-20, 40), len: rand(50, 110), delay: rand(0, 0.3) }));

  return progress(stage, 420, (g, k) => {
    g.globalCompositeOperation = "lighter";
    g.lineCap = "round";
    g.strokeStyle = "#e6fbff";

    for (const l of lines) {
      const u = clamp01((k - l.delay) / (1 - l.delay));

      if (u <= 0 || u >= 1) continue;

      const head = l.x0 - dir * u * 140;

      g.globalAlpha = Math.sin(u * Math.PI) * 0.8;
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(head, l.y);
      g.lineTo(head - dir * l.len * (1 - u * 0.5), l.y);
      g.stroke();
    }
  });
}

export const haste: FxAnimation = ({ stage, from, targets }) =>
  perTarget(stage, targets, 0, async ({ at: target, el }) => {
    await gust(stage, from, target);

    const box = stage.layer.getBoundingClientRect();

    // Dash towards the middle of the field, where the enemies are.
    const dir = target.x < box.width / 2 ? 1 : -1;

    const feathers: Feather[] = Array.from({ length: 12 }, (_, n) => ({ a: (n / 12) * Math.PI * 2, speed: rand(9, 13), h: rand(0, 1), len: rand(14, 20), spin: rand(-6, 6), rot: rand(0, 6) }));

    const halo = glow("#7ff0ff");

    let t = 0;

    // Whirl centre height: from the feet up to the shoulders.
    const level = (h: number, k: number) => target.y + 26 - (h * 0.5 + easeOutCubic(k) * 0.6) * 56;

    const hide = show(stage, (g) => {
      const k = t / WHIRL_MS;

      const fade = envelope(k, 0.1, 0.3);

      sprite(g, halo, target.x, target.y, 3, 1.5, fade * 0.35);

      g.lineCap = "butt";
      g.globalCompositeOperation = "lighter";

      // A funnel: narrow at the feet, wide at the shoulders, every band whipping round.
      for (let r = 0; r < 10; r++) {
        const h = r / 9;

        const cy = level(h, k);

        const rx = 26 + h * 50 + Math.sin(k * 3 + r) * 4;

        const ry = 7 + h * 9;

        const head = t * 0.02 + r * 2.4;

        // A helix, not a ring: the band climbs as it sweeps round, its tail trailing lower.
        const at = (a: number) => ({ x: target.x + Math.cos(a) * rx, y: cy + Math.sin(a) * ry + (head - a) * 5 });

        for (let s = 0; s < 14; s++) {
          const a0 = head - (s / 14) * 2;

          const p0 = at(a0);

          const p1 = at(head - ((s + 1) / 14) * 2);

          const front = Math.sin(a0) > 0 ? 1 : 0.35;

          g.globalAlpha = fade * (1 - s / 14) * front;
          g.strokeStyle = s < 5 ? "#ffffff" : "#b8e8f5";
          g.lineWidth = (3.6 - s * 0.2) * (0.7 + h * 0.5);
          g.beginPath();
          g.moveTo(p0.x, p0.y);
          g.lineTo(p1.x, p1.y);
          g.stroke();
        }
      }

      g.globalCompositeOperation = "source-over";

      for (const f of feathers) {
        const pos = f.free ?? { x: target.x + Math.cos(f.a) * (30 + f.h * 46), y: level(f.h, k) + Math.sin(f.a) * (8 + f.h * 9) };

        g.save();
        g.translate(pos.x, pos.y);
        g.rotate(f.rot);
        g.globalAlpha = f.free ? fade : fade * (Math.sin(f.a) > 0 ? 1 : 0.55);
        feather(g, f.len, "#f6fbff", "#9cc8dc");
        g.restore();
      }
    });

    const dash = el
      ? wait(stage, DASH_AT).then(() => {
          const surge: Keyframe[] = [{ transform: "none" }, { transform: `translateX(${dir * 34}px)`, offset: 0.22 }, { transform: `translateX(${dir * 6}px)`, offset: 0.6 }, { transform: "none" }];

          const opts = { duration: 620, easing: "cubic-bezier(.2,.8,.3,1)" };

          void speedLines(stage, target, dir);

          return Promise.all([animateEl(stage, el, surge, opts), ...[1, 2, 3].map((n) => playGhost(stage, el, GHOST_FILTER, surge.map((f) => ({ ...f, opacity: 0.6 - n * 0.14 })), { ...opts, delay: n * 70 }))]);
        })
      : undefined;

    const run = tween(stage, WHIRL_MS, (k, dt) => {
      t = k * WHIRL_MS;

      for (const f of feathers) {
        f.rot += f.spin * dt;

        if (f.free) {
          f.free.x += f.free.vx * dt;
          f.free.y += f.free.vy * dt;
          f.free.vy += 30 * dt;
          continue;
        }

        f.a += f.speed * dt;

        if (k > 0.68 && chance(0.08, dt)) {
          const r = 30 + f.h * 46;

          const v = f.speed * r * 0.6;

          f.free = { x: target.x + Math.cos(f.a) * r, y: level(f.h, k) + Math.sin(f.a) * (8 + f.h * 9), vx: -Math.sin(f.a) * v, vy: Math.cos(f.a) * v * 0.3 - 40 };
        }
      }

      if (k < 0.7 && chance(0.5, dt)) emit(stage, { x: target.x + rand(-40, 40), y: target.y + 24 }, { tints: WIND, speed: [30, 80], angle: [-Math.PI * 0.7, -Math.PI * 0.3], life: [0.3, 0.6], scale: [0.14, 0.03], spread: 6 });
    }).then(hide);

    await Promise.all([run, dash]);
  });
