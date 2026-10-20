import type { FxAnimation } from "./types";

import { halfSize } from "@/components/battle/fx/runtime/anchors";
import { sinkingBadge } from "@/components/battle/fx/runtime/badge";
import { clamp01, easeOutCubic } from "@/components/battle/fx/runtime/easing";
import { chance, type FxPoint, perTick, rand } from "@/components/battle/fx/runtime/geometry";
import { motionPath } from "@/components/battle/fx/runtime/motion";
import { emit } from "@/components/battle/fx/runtime/primitives";
import { perTarget } from "@/components/battle/fx/runtime/recipes";
import { polyline, thornPath } from "@/components/battle/fx/runtime/shapes";
import { animateEl, schedule, show, type Stage, timeline, tween } from "@/components/battle/fx/runtime/stage";
import { streakBurst } from "@/components/battle/fx/runtime/streaks";
import { glow, sprite } from "@/components/battle/fx/runtime/texture";
import { ARCHETYPE_FX } from "@/lib/utils/battle/fx";

const ERUPT_MS = ARCHETYPE_FX.thorns.impactMs;

const TOTAL_MS = 2600;

const PULSES = [ERUPT_MS + 250, ERUPT_MS + 800, ERUPT_MS + 1350];

const WITHER_MS = 2150;

const CRIMSON = ["#ff3a5a", "#c0104a", "#ff7a9a", "#a020a0"];

const BADGE = { top: "#4a0e22", bottom: "#1a0610", rim: "#d0305a", ink: "#ffd8e0" };

interface Thorn {
  x: number;
  y: number;
  len: number;
  width: number;
  lean: number;
  bend: number;
  born: number;
}

async function hook(stage: Stage, from: FxPoint, to: FxPoint) {
  const tex = glow("#c0104a");

  let pos = from;

  const hide = show(stage, (g) => {
    sprite(g, tex, pos.x, pos.y, 0.6, undefined, 0.9);
    sprite(g, glow("#ffffff"), pos.x, pos.y, 0.15);
  });

  // It dives into the ground under the foe: the thorns come from below.
  const ground = { x: to.x, y: to.y + 30 };

  await tween(stage, ERUPT_MS, (k, dt) => {
    const e = k ** 1.6;

    pos = { x: from.x + (ground.x - from.x) * e, y: from.y + (ground.y - from.y) * e - Math.sin(k * Math.PI) * 50 };
    perTick(1, dt, () => emit(stage, pos, { tints: CRIMSON, speed: [5, 25], life: [0.25, 0.45], scale: [0.3, 0.05], spread: 3 }));
  });
  hide();
}

// A branching vein of pain from a thorn tip inwards across the row.
function vein(from: FxPoint, to: FxPoint): FxPoint[] {
  return Array.from({ length: 7 }, (_, n) => {
    const u = n / 6;

    return { x: from.x + (to.x - from.x) * u + rand(-4, 4) * Math.sin(u * Math.PI), y: from.y + (to.y - from.y) * u + rand(-4, 4) * Math.sin(u * Math.PI) };
  });
}

/** The veins of pain lit crimson by a pulse. */
function painVeins(g: CanvasRenderingContext2D, veins: FxPoint[][], beat: number, wither: number) {
  g.globalCompositeOperation = "lighter";
  g.lineCap = "round";

  for (const v of veins) {
    g.globalAlpha = beat * 0.8 * (1 - wither);
    g.strokeStyle = "#c0104a";
    g.lineWidth = 2.2;
    polyline(g, v);
    g.strokeStyle = "#ff7a9a";
    g.lineWidth = 0.8;
    polyline(g, v);
  }
}

/** The bramble the thorns grow from, snaking along under the foe. */
function bramble(g: CanvasRenderingContext2D, spikes: Thorn[], vine: number) {
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = vine;
  g.lineCap = "round";

  for (const [color, width] of [["#3a0a1a", 6], ["#0a0306", 4]] as const) {
    g.strokeStyle = color;
    g.lineWidth = width;
    g.beginPath();
    spikes.forEach((sp, n) => {
      const y = sp.y - 2 + (n % 2 ? 3 : -3);

      if (n === 0) g.moveTo(sp.x, y);
      else g.quadraticCurveTo((sp.x + spikes[n - 1].x) / 2, y + (n % 2 ? 6 : -6), sp.x, y);
    });
    g.stroke();
  }
}

/** One thorn stabbing up (overshooting, then settling), its edge lit by the pulse. */
function spike(g: CanvasRenderingContext2D, sp: Thorn, t: number, look: { fill: CanvasGradient; beat: number; wither: number }) {
  const k = clamp01((t - sp.born) / 160);

  if (k <= 0) return;

  const grow = (k < 1 ? easeOutCubic(k) * 1.15 : 1) * (1 - look.wither * 0.9);

  g.save();
  g.translate(sp.x, sp.y);
  g.rotate(sp.lean);
  g.scale(1, (grow * sp.len) / 40);
  g.globalAlpha = 1 - look.wither;
  g.globalCompositeOperation = "source-over";
  thornPath(g, 40, sp.width, sp.bend);
  g.fillStyle = look.fill;
  g.fill();
  g.strokeStyle = `rgba(210,30,75,${0.2 + look.beat * 0.75})`;
  g.lineWidth = 1;
  g.stroke();
  g.restore();
}

export const thorns: FxAnimation = ({ stage, from, targets }) =>
  perTarget(stage, targets, 0, async ({ at: target, el }) => {
    await hook(stage, from, target);

    const { w, h } = halfSize(el);

    const count = Math.max(7, Math.round(w / 12));

    // A ring of thorns round the foe: the front ones stab up across its lower edge, the ends lean in.
    const spikes: Thorn[] = Array.from({ length: count }, (_, n) => {
      const u = n / (count - 1);

      const x = target.x + (u * 2 - 1) * (w + 6);

      const edge = Math.abs(u * 2 - 1);

      return { x, y: target.y + h + 4 - edge * h * 0.4, len: h * (1.25 + (1 - edge) * 0.6) * rand(0.85, 1.15), width: rand(5, 7.5), lean: (u * 2 - 1) * -0.35 + rand(-0.15, 0.15), bend: rand(-5, 5), born: rand(0, 120) };
    });

    const veins = spikes.filter((_, n) => n % 2 === 0).map((sp) => vein({ x: sp.x + Math.sin(sp.lean) * sp.len * 0.8, y: sp.y - sp.len * 0.8 }, { x: target.x + rand(-w * 0.4, w * 0.4), y: target.y + rand(-h * 0.5, h * 0.2) }));

    const fill = stage.g.createLinearGradient(0, 0, 0, -40);

    fill.addColorStop(0, "#050206");
    fill.addColorStop(0.6, "#1a0610");
    fill.addColorStop(1, "#6a0a2a");

    const throb = glow("#c0104a");

    const run = timeline(
      stage,
      TOTAL_MS - ERUPT_MS,
      (g, t) => {
        const wither = clamp01((t - WITHER_MS + ERUPT_MS) / 400);

        // Each pain pulse lights the veins and the thorns' edges crimson.
        const beat = Math.max(0, ...PULSES.map((p) => Math.exp(-(((t + ERUPT_MS - p) / 110) ** 2))));

        sprite(g, throb, target.x, target.y, (w * 2.4) / 64, (h * 2.6) / 64, beat * 0.6);

        if (beat > 0.05) painVeins(g, veins, beat, wither);

        const vine = clamp01(t / 180) * (1 - wither);

        if (vine > 0) bramble(g, spikes, vine);

        for (const sp of spikes) spike(g, sp, t, { fill, beat, wither });

        sinkingBadge(g, target.x + w * 0.35, target.y - h - 10, clamp01((t - 900) / 1300), "−3 атака", BADGE);
        g.globalAlpha = 1;
      },
      (t, dt) => {
        if (t > WITHER_MS - ERUPT_MS && t < WITHER_MS - ERUPT_MS + 300 && chance(0.6, dt)) emit(stage, { x: target.x + rand(-w, w), y: target.y + h }, { tints: ["#1a0610", "#2a0a18"], speed: [10, 30], angle: [-Math.PI * 0.7, -Math.PI * 0.3], life: [0.5, 0.8], scale: [0.4, 0.8], additive: false, alpha: 0.5 });
      },
    );

    const jolt = motionPath([
      { at: 0, x: 0, y: 0 },
      ...PULSES.flatMap((p) => [
        { at: p - ERUPT_MS - 10, x: 0, y: 0 },
        { at: p - ERUPT_MS + 40, x: rand(-3, 3), y: -3, rot: rand(-1.5, 1.5) },
        { at: p - ERUPT_MS + 110, x: rand(-2, 2), y: 1 },
        { at: p - ERUPT_MS + 200, x: 0, y: 0 },
      ]),
      { at: TOTAL_MS - ERUPT_MS, x: 0, y: 0 },
    ]);

    const span = TOTAL_MS - ERUPT_MS;

    // Each pulse flushes the row crimson, and it stays a little paler between them.
    const flushes: Keyframe[] = [
      { offset: 0, filter: "none" },
      ...PULSES.flatMap((p, n) => [
        { offset: (p - ERUPT_MS - 20) / span, filter: n ? "brightness(.85)" : "none" },
        { offset: (p - ERUPT_MS + 60) / span, filter: "brightness(1.25) sepia(1) hue-rotate(-45deg) saturate(3)" },
        { offset: (p - ERUPT_MS + 300) / span, filter: "brightness(.85)" },
      ]),
      { offset: 1, filter: "none" },
    ];

    const writhe = Promise.all([
      animateEl(stage, el, jolt.keyframes, { duration: jolt.duration }),
      animateEl(stage, el, flushes, { duration: span }),
    ]);

    for (const p of PULSES) {
      schedule(stage, p - ERUPT_MS, () => {
        for (const sp of spikes.filter((_, n) => n % 3 === 0)) void streakBurst(stage, { x: sp.x + Math.sin(sp.lean) * sp.len * 0.9, y: sp.y - sp.len * 0.9 }, { colors: CRIMSON, count: 4, speed: [60, 140], life: [0.2, 0.4], gravity: 300 });
      });
    }

    schedule(stage, 0, () => void streakBurst(stage, { x: target.x, y: target.y + h }, { colors: ["#3a0a1a", "#6a0a2a", "#ff3a5a"], count: 18, angle: -Math.PI / 2, cone: 1.3, speed: [120, 260], life: [0.25, 0.5], gravity: 500 }));

    await Promise.all([run, writhe]);
  });
