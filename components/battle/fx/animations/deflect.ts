import type { FxAnimation } from "./types";

import { halfSize } from "@/components/battle/fx/runtime/anchors";
import { clamp01, envelope } from "@/components/battle/fx/runtime/easing";
import { farSide, type FxPoint, rand } from "@/components/battle/fx/runtime/geometry";
import { flash } from "@/components/battle/fx/runtime/primitives";
import { perTarget } from "@/components/battle/fx/runtime/recipes";
import { arrow } from "@/components/battle/fx/runtime/shapes";
import { timeline } from "@/components/battle/fx/runtime/stage";
import { streakBurst } from "@/components/battle/fx/runtime/streaks";
import { ARCHETYPE_FX } from "@/lib/utils/battle/fx";

const TOTAL_MS = 2500;

const FLIGHT_MS = 230;

const VOLLEY = [ARCHETYPE_FX.deflect.impactMs - FLIGHT_MS, 780, 960, 1180, 1420];

const SPARKS = ["#ffffff", "#fff3c0", "#ffe39a"];

interface Arrow {
  start: FxPoint;
  hit: FxPoint;
  at: number;
  /** Set after the glance: the arrow tumbles off on its own. */
  free?: { x: number; y: number; vx: number; vy: number; rot: number; spin: number; t0: number };
}

interface Veil {
  rx: number;
  ry: number;
  fill: CanvasGradient;
}

/** The swirling veil: thin sheets of light chasing each other round the hero (centred on it). */
function veil(g: CanvasRenderingContext2D, { rx, ry, fill }: Veil, t: number, life: number) {
  const spin = t / 260;

  g.globalAlpha = life;
  g.fillStyle = fill;
  g.beginPath();
  g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  g.fill();

  for (let s = 0; s < 4; s++) {
    const head = spin * (s % 2 ? -0.7 : 1) + (s * Math.PI) / 2;

    const span = 0.9 + 0.5 * Math.sin(t / 300 + s);

    const k = 1 + (s % 2) * 0.08;

    for (let b = 0; b < 2; b++) {
      g.globalAlpha = life * (b ? 0.95 : 0.3);
      g.strokeStyle = b ? "#fffbe8" : "#ffd86b";
      g.lineWidth = b ? 1.6 : 8;
      g.beginPath();
      g.ellipse(0, 0, rx * k, ry * k, 0, head, head + span * life);
      g.stroke();
    }
  }
}

/** Where an arrow glanced, the veil flares in a short bright arc. */
function glanceFlares(g: CanvasRenderingContext2D, { rx, ry }: Veil, ripples: { at: number; angle: number }[], t: number) {
  for (const r of ripples) {
    const k = (t - r.at) / 450;

    if (k <= 0 || k >= 1) continue;

    g.globalAlpha = 1 - k;
    g.strokeStyle = "#ffffff";
    g.lineWidth = 3 * (1 - k) + 1;
    g.beginPath();
    g.ellipse(0, 0, rx * (1 + k * 0.12), ry * (1 + k * 0.12), 0, r.angle - 0.5 - k * 0.4, r.angle + 0.5 + k * 0.4);
    g.stroke();
  }
}

/** An arrow in flight with its streak, or tumbling off after the glance. */
function volleyArrow(g: CanvasRenderingContext2D, a: Arrow, t: number, trail: CanvasGradient) {
  const k = (t - a.at) / FLIGHT_MS;

  if (k <= 0) return;

  let x: number, y: number, rot: number, alpha: number;

  if (a.free) {
    const age = (t - a.free.t0) / 1000;

    ({ x, y, rot } = a.free);
    alpha = clamp01(1 - (age - 0.55) / 0.35);
  } else {
    const e = Math.min(1, k);

    x = a.start.x + (a.hit.x - a.start.x) * e;
    y = a.start.y + (a.hit.y - a.start.y) * e;
    rot = Math.atan2(a.hit.y - a.start.y, a.hit.x - a.start.x);
    alpha = Math.min(1, k * 4);
  }

  if (alpha <= 0) return;

  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.globalAlpha = alpha;

  if (!a.free) {
    g.strokeStyle = trail;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(-70, 0);
    g.lineTo(-38, 0);
    g.stroke();
  }

  g.shadowColor = "rgba(0,0,0,0.7)";
  g.shadowBlur = 3;
  arrow(g, 40);
  g.restore();
}

export const deflect: FxAnimation = ({ stage, from, targets }) =>
  perTarget(stage, targets, 0, async ({ at: target, el }) => {
    const { w, h } = halfSize(el);

    const rx = w + 14;

    const ry = h + 16;

    // The volley comes from the far side of the field.
    const dir = farSide(target, from, stage.layer.clientWidth);

    const arrows: Arrow[] = VOLLEY.map((at, n) => {
      const a = (dir > 0 ? 0 : Math.PI) + (n % 2 ? 1 : -1) * rand(0.15, 0.75);

      const hit = { x: target.x + Math.cos(a) * rx, y: target.y + Math.sin(a) * ry };

      return { at, hit, start: { x: hit.x + dir * rand(180, 240), y: hit.y + rand(-50, 30) } };
    });

    const ripples: { at: number; angle: number }[] = [];

    const fill = stage.g.createRadialGradient(0, 0, ry * 0.4, 0, 0, rx);

    fill.addColorStop(0, "rgba(255,240,200,0)");
    fill.addColorStop(1, "rgba(255,226,150,0.12)");

    const trail = stage.g.createLinearGradient(-70, 0, 0, 0);

    trail.addColorStop(0, "rgba(255,255,255,0)");
    trail.addColorStop(1, "rgba(255,255,255,0.55)");

    const shape: Veil = { rx, ry, fill };

    const run = timeline(
      stage,
      TOTAL_MS,
      (g, t) => {
        g.save();
        g.translate(target.x, target.y);
        g.globalCompositeOperation = "lighter";
        g.lineCap = "round";
        veil(g, shape, t, envelope(t / TOTAL_MS, 0.12, 0.2));
        glanceFlares(g, shape, ripples, t);
        g.restore();

        g.globalCompositeOperation = "source-over";

        for (const a of arrows) volleyArrow(g, a, t, trail);
      },
      (t, dt) => {
        for (const a of arrows) {
          if (a.free) {
            a.free.vy += 600 * dt;
            a.free.x += a.free.vx * dt;
            a.free.y += a.free.vy * dt;
            a.free.rot += a.free.spin * dt;
            continue;
          }

          if (t < a.at + FLIGHT_MS) continue;

          // Glances off: knocked back the way it came and up (or down), then drops spinning.
          const angle = Math.atan2((a.hit.y - target.y) / ry, (a.hit.x - target.x) / rx);

          a.free = { x: a.hit.x, y: a.hit.y, vx: dir * rand(50, 110), vy: (a.hit.y < target.y ? -1 : 0.4) * rand(90, 170) - 60, rot: Math.atan2(a.hit.y - a.start.y, a.hit.x - a.start.x), spin: dir * rand(9, 15) * (a.hit.y < target.y ? -1 : 1), t0: t };
          ripples.push({ at: t, angle });
          void flash(stage, a.hit, "#fff1b8", 46, 260);
          void streakBurst(stage, a.hit, { colors: SPARKS, count: 8, angle: Math.atan2(a.start.y - a.hit.y, a.start.x - a.hit.x), cone: 0.9, speed: [100, 220], life: [0.15, 0.3], gravity: 300, width: [0.9, 1.5] });
        }
      },
    );

    await run;
  });
