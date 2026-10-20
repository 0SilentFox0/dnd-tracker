import type { FxAnimation } from "./types";

import { clamp01, easeOutCubic } from "@/components/battle/fx/runtime/easing";
import { figureHead, figurePath, summonSpot } from "@/components/battle/fx/runtime/figure";
import { chance, type FxPoint, rand, zigzag } from "@/components/battle/fx/runtime/geometry";
import { flash, ring } from "@/components/battle/fx/runtime/primitives";
import { perTarget } from "@/components/battle/fx/runtime/recipes";
import { polyline } from "@/components/battle/fx/runtime/shapes";
import { schedule, timeline } from "@/components/battle/fx/runtime/stage";
import { streakBurst } from "@/components/battle/fx/runtime/streaks";
import { glow, spritePx } from "@/components/battle/fx/runtime/texture";
import { ARCHETYPE_FX } from "@/lib/utils/battle/fx";

const STRIKE_MS = ARCHETYPE_FX.airsummon.impactMs;

const CALM_MS = 1500;

const TOTAL_MS = 2600;

const BANDS = 9;

const SPARK = ["#ffffff", "#fff6a8", "#9fd8ff"];

interface Speck {
  u: number;
  a: number;
  speed: number;
  size: number;
  leaf: boolean;
}

interface Arc {
  pts: FxPoint[];
  until: number;
}

interface Funnel {
  x: number;
  ground: number;
  top: number;
  H: number;
}

/** Funnel radius at height share u: a narrow foot under the caster, a wide mouth up top. */
const funnelRadius = (H: number, u: number, k: number) => (H * 0.05 + u ** 1.4 * H * 0.42) * k;

/** The whirlwind: thin bands racing round a funnel, back halves dimmer. */
function whirlwind(g: CanvasRenderingContext2D, { x, ground, top, H }: Funnel, time: number, spin: number, reach: number) {
  g.globalCompositeOperation = "lighter";
  g.lineCap = "round";

  for (let b = 0; b < BANDS; b++) {
    const u = (b + 0.5) / BANDS;

    const y = ground - (ground - top) * u * reach;

    const r = funnelRadius(H, u, spin);

    const phase = -time * 11 + b * 0.7;

    for (const [from, alpha] of [[phase, 0.75], [phase + Math.PI, 0.3]] as const) {
      g.globalAlpha = alpha * spin;
      g.strokeStyle = b % 3 ? "#d8ecf5" : "#9fd8ff";
      g.lineWidth = 1.2 + u * 1.6;
      g.beginPath();
      g.ellipse(x, y, r, r * 0.22, 0, from, from + Math.PI * 0.75);
      g.stroke();
    }
  }
}

/** Dust and torn leaves whirling with it. */
function whirlingSpecks(g: CanvasRenderingContext2D, { x, ground, top, H }: Funnel, specks: Speck[], time: number, spin: number, reach: number) {
  for (const s of specks) {
    const u = s.u * reach;

    const r = funnelRadius(H, s.u, spin) * 1.05;

    const a = s.a - time * s.speed;

    const front = Math.sin(a) > 0;

    g.globalCompositeOperation = "source-over";
    g.globalAlpha = spin * (front ? 0.9 : 0.4);
    g.fillStyle = s.leaf ? "#7a9a48" : "#b8a080";
    g.beginPath();
    g.ellipse(x + Math.cos(a) * r, ground - (ground - top) * u + Math.sin(a) * r * 0.22, s.size * (s.leaf ? 1.6 : 1), s.size * 0.7, a, 0, Math.PI * 2);
    g.fill();
  }
}

/** Lightning crackling inside the funnel. */
function crackling(g: CanvasRenderingContext2D, arcs: Arc[], t: number) {
  g.globalCompositeOperation = "lighter";

  for (const arc of arcs) {
    if (t > arc.until) continue;

    g.globalAlpha = 0.9;
    g.strokeStyle = "rgba(159,216,255,0.6)";
    g.lineWidth = 4;
    polyline(g, arc.pts);
    g.strokeStyle = "#ffffff";
    g.lineWidth = 1.4;
    polyline(g, arc.pts);
  }
}

/** Wind curling round the body (in the figure's frame). */
function windCurls(g: CanvasRenderingContext2D, H: number, time: number, body: number) {
  g.lineWidth = 1.1;

  for (let n = 0; n < 3; n++) {
    const y = -H * (0.25 + n * 0.22);

    const phase = time * 7 + n * 2;

    g.globalAlpha = body * 0.6;
    g.beginPath();
    g.ellipse(0, y, H * 0.3, H * 0.06, -0.15, phase, phase + Math.PI * 0.9);
    g.stroke();
  }
}

/** The see-through figure standing in the eye of the storm. */
function airFigure(g: CanvasRenderingContext2D, { x, ground, H }: Funnel, time: number, body: number) {
  const head = figureHead(H);

  const sway = (p: FxPoint, n: number) => ({ x: p.x + Math.sin(time * 6 + n * 0.8 + p.y * 0.06) * H * 0.015, y: p.y });

  g.save();
  g.translate(x, ground);
  spritePx(g, glow("#9fd8ff"), 0, -H * 0.5, H, H * 1.3, 0.35 * body);
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = body * 0.22;
  g.fillStyle = "#cfeaff";
  figurePath(g, H, { armLift: 0.2 }, sway);
  g.fill();
  g.globalCompositeOperation = "lighter";
  g.strokeStyle = "#cfeaff";
  g.globalAlpha = body * 0.25;
  g.lineWidth = 4;
  figurePath(g, H, { armLift: 0.2 }, sway);
  g.stroke();
  g.globalAlpha = body * 0.75;
  g.lineWidth = 1.1;
  g.strokeStyle = "#f2faff";
  g.stroke();
  windCurls(g, H, time, body);

  for (const side of [-1, 1]) spritePx(g, glow("#ffffff"), head.x + side * head.r * 0.42, head.y + head.r * 0.1, head.r * 0.6, undefined, body);

  g.restore();
}

export const airsummon: FxAnimation = ({ stage, targets }) =>
  perTarget(stage, targets, 0, async ({ at: target, el }) => {
    const { x, ground, height: H } = summonSpot(el, target);

    const top = ground - H * 1.15;

    const funnel: Funnel = { x, ground, top, H };

    const radius = (u: number, k: number) => funnelRadius(H, u, k);

    const specks: Speck[] = Array.from({ length: 34 }, () => ({ u: rand(0.05, 1), a: rand(0, Math.PI * 2), speed: rand(7, 11), size: rand(1.2, 2.6), leaf: Math.random() < 0.25 }));

    const arcs: Arc[] = [];

    const run = timeline(
      stage,
      TOTAL_MS,
      (g, t) => {
        const time = t / 1000;

        const spin = easeOutCubic(clamp01(t / 450)) * (1 - clamp01((t - CALM_MS) / 500));

        const reach = easeOutCubic(clamp01(t / 600));

        if (spin > 0) {
          whirlwind(g, funnel, time, spin, reach);
          whirlingSpecks(g, funnel, specks, time, spin, reach);
        }

        crackling(g, arcs, t);

        const body = clamp01((t - STRIKE_MS) / 450) * (1 - clamp01((t - TOTAL_MS + 450) / 450));

        if (body > 0) airFigure(g, funnel, time, body);

        g.globalAlpha = 1;
      },
      (t, dt) => {
        if (t > next && t < CALM_MS) {
          crackle(t + rand(70, 130));
          next = t + rand(110, 220);
        }

        if (t > STRIKE_MS && t < TOTAL_MS - 500 && chance(0.06, dt)) {
          const p = { x: x + rand(-H * 0.15, H * 0.15), y: ground - rand(H * 0.2, H * 0.8) };

          arcs.push({ pts: zigzag(p, { x: p.x + rand(-H * 0.12, H * 0.12), y: p.y + rand(-H * 0.12, H * 0.12) }, 4, H * 0.03), until: t + 90 });
        }

        for (let n = arcs.length - 1; n >= 0; n--) if (arcs[n].until < t) arcs.splice(n, 1);
      },
    );

    const crackle = (until: number) => {
      const u0 = rand(0.15, 0.9);

      const u1 = Math.min(1, u0 + rand(0.15, 0.35));

      const a = { x: x + rand(-1, 1) * radius(u0, 0.8), y: ground - (ground - top) * u0 };

      const b = { x: x + rand(-1, 1) * radius(u1, 0.8), y: ground - (ground - top) * u1 };

      arcs.push({ pts: zigzag(a, b, 6, H * 0.06), until });
    };

    // Lightning strikes down the eye of the whirlwind and the figure steps out of it.
    schedule(stage, STRIKE_MS, () => {
      arcs.push({ pts: zigzag({ x: x + rand(-8, 8), y: Math.max(0, top - 30) }, { x, y: ground - H * 0.4 }, 9, H * 0.08), until: STRIKE_MS + 160 });
      void flash(stage, { x, y: ground - H * 0.5 }, "#dff4ff", H * 1.8, 450);
      void ring(stage, { x, y: ground }, "#c8f1ff", 650, H * 0.7, 2.5, 0.25);
      void streakBurst(stage, { x, y: ground - H * 0.4 }, { colors: SPARK, count: 16, speed: [120, 280], gravity: 60, life: [0.2, 0.45] });
    });

    // It leaves on a gust.
    schedule(stage, TOTAL_MS - 450, () => void streakBurst(stage, { x, y: ground - H * 0.5 }, { colors: ["#e6f6ff", "#b8e8f5"], count: 8, angle: 0, cone: Math.PI, speed: [140, 260], gravity: 0, drag: 1.5, tail: 0.06, life: [0.25, 0.4], width: [0.8, 1.4] }));

    let next = 200;

    await run;
  });
