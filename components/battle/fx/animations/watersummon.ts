import { lightBeam } from "../runtime/beam";
import { clamp01, easeOutCubic, envelope } from "../runtime/easing";
import { figureHead, figurePath, summonSpot } from "../runtime/figure";
import { chance, type FxPoint, rand } from "../runtime/geometry";
import { emit, flash, ring, shoot } from "../runtime/primitives";
import { perTarget } from "../runtime/recipes";
import { polyPath, twinkle } from "../runtime/shapes";
import { schedule, show, tween } from "../runtime/stage";
import { streakBurst } from "../runtime/streaks";
import { glow, spritePx } from "../runtime/texture";
import type { FxAnimation } from "./types";

import { ARCHETYPE_FX } from "@/lib/utils/battle/fx";

const SPOUT_MS = 280;

const FREEZE_MS = ARCHETYPE_FX.watersummon.impactMs;

const TOTAL_MS = 2600;

const SPRAY = ["#ffffff", "#c8f1ff", "#6fd3ff"];

const MIST = ["#e8f6ff", "#cfe8f5", "#b8dcef"];

const ICE = ["#ffffff", "#dff6ff", "#a8e4ff"];

interface Shard {
  at: FxPoint;
  angle: number;
  len: number;
}

// Ice crystals crusting the head and shoulders, as fractions of the height.
const SHARDS: Shard[] = [
  { at: { x: -0.05, y: -0.95 }, angle: -1.9, len: 0.11 },
  { at: { x: 0.01, y: -0.97 }, angle: -1.6, len: 0.14 },
  { at: { x: 0.06, y: -0.95 }, angle: -1.25, len: 0.1 },
  { at: { x: -0.2, y: -0.76 }, angle: -2.3, len: 0.1 },
  { at: { x: -0.17, y: -0.78 }, angle: -1.9, len: 0.08 },
  { at: { x: 0.2, y: -0.76 }, angle: -0.85, len: 0.1 },
  { at: { x: 0.17, y: -0.78 }, angle: -1.25, len: 0.08 },
  { at: { x: -0.27, y: -0.45 }, angle: 2.6, len: 0.06 },
  { at: { x: 0.27, y: -0.45 }, angle: 0.5, len: 0.06 },
];

function shard(g: CanvasRenderingContext2D, s: Shard, H: number, grow: number) {
  const len = s.len * H * grow;

  const w = len * 0.28;

  const c = Math.cos(s.angle);

  const sn = Math.sin(s.angle);

  const x = s.at.x * H;

  const y = s.at.y * H;

  polyPath(g, [
    { x: x - sn * w, y: y + c * w },
    { x: x + c * len, y: y + sn * len },
    { x: x + sn * w, y: y - c * w },
  ]);
  g.fillStyle = "rgba(225,248,255,0.92)";
  g.fill();
  g.strokeStyle = "rgba(90,170,220,0.9)";
  g.lineWidth = 0.8;
  g.stroke();
}

export const watersummon: FxAnimation = ({ stage, from, to, targetEls }) =>
  perTarget(stage, to, 0, async (target, i) => {
    const { x, ground, height: H } = summonSpot(targetEls[i], target);

    const head = figureHead(H);

    let t = 0;

    const hide = show(stage, (g) => {
      const time = t / 1000;

      const spout = clamp01((t - SPOUT_MS) / 380);

      const frozen = clamp01((t - FREEZE_MS) / 220);

      const fade = 1 - clamp01((t - TOTAL_MS + 450) / 450);

      // A puddle spreading under it, then crusting with frost.
      if (t > SPOUT_MS * 0.6) {
        const spread = easeOutCubic(clamp01((t - SPOUT_MS * 0.6) / 400));

        g.globalCompositeOperation = "source-over";
        g.globalAlpha = 0.5 * fade;
        g.fillStyle = frozen > 0 ? "#cfe8f5" : "#1e5a8a";
        g.beginPath();
        g.ellipse(x, ground, H * 0.45 * spread, H * 0.08 * spread, 0, 0, Math.PI * 2);
        g.fill();
        spritePx(g, glow("#6fd3ff"), x, ground, H * 1.1 * spread, H * 0.2, 0.6 * fade);
      }

      // The water spout: a column wrapped in spiralling currents.
      const column = spout * (1 - frozen);

      if (column > 0) {
        const top = ground - H * 1.25 * easeOutCubic(spout);

        lightBeam(g, x, top, ground + 2, H * 0.24, column * 0.85, "90,180,255", 0.2);
        lightBeam(g, x, top + H * 0.1, ground, H * 0.09, column * 0.9, "220,245,255", 0.25);
        g.globalCompositeOperation = "lighter";
        g.lineCap = "round";

        for (let b = 0; b < 7; b++) {
          const y = ground - (b + 0.5) * ((ground - top) / 7);

          const rx = H * (0.16 + 0.05 * Math.sin(b * 1.3));

          const phase = time * 9 + b * 0.9;

          g.globalAlpha = column * 0.85;
          g.strokeStyle = b % 2 ? "#c8f1ff" : "#6fd3ff";
          g.lineWidth = 2.2;
          g.beginPath();
          g.ellipse(x, y, rx, rx * 0.28, 0, phase, phase + Math.PI * 0.9);
          g.stroke();
        }
      }

      // Frozen into a body of waves and ice.
      if (frozen <= 0 || fade <= 0) return;

      const a = frozen * fade;

      g.save();
      g.translate(x, ground);
      spritePx(g, glow("#4ab0ff"), 0, -H * 0.5, H * 1.1, H * 1.4, 0.55 * a);

      const ripple = (p: FxPoint, n: number) => ({ x: p.x + Math.sin(time * 4 + n * 1.3 + p.y * 0.08) * H * 0.012, y: p.y });

      const fill = g.createLinearGradient(0, 0, 0, -H);

      fill.addColorStop(0, "rgba(20,70,140,0.88)");
      fill.addColorStop(0.5, "rgba(40,130,210,0.82)");
      fill.addColorStop(1, "rgba(150,220,255,0.88)");
      g.globalCompositeOperation = "source-over";
      g.globalAlpha = a;
      g.fillStyle = fill;
      figurePath(g, H, { bulk: 1.1 }, ripple);
      g.fill();

      // Waves rolling up inside the body.
      g.save();
      figurePath(g, H, { bulk: 1.1 }, ripple);
      g.clip();
      g.globalCompositeOperation = "lighter";
      g.lineWidth = 1.6;

      for (let w = 0; w < 6; w++) {
        const y = -((((time * 0.35 + w / 6) % 1) + 0.02) * H);

        g.strokeStyle = `rgba(200,240,255,${0.55 * a})`;
        g.beginPath();

        for (let sx = -H * 0.32; sx <= H * 0.32; sx += 3) g.lineTo(sx, y + Math.sin(sx * 0.25 + time * 6 + w) * H * 0.02);

        g.stroke();
      }

      g.restore();
      g.globalCompositeOperation = "source-over";
      g.strokeStyle = `rgba(220,248,255,${0.9 * a})`;
      g.lineWidth = 1.2;
      figurePath(g, H, { bulk: 1.1 }, ripple);
      g.stroke();
      g.globalAlpha = a;

      for (const s of SHARDS) shard(g, s, H, easeOutCubic(clamp01((t - FREEZE_MS) / 300)));

      // Cold white eyes.
      for (const side of [-1, 1]) spritePx(g, glow("#ffffff"), head.x + side * head.r * 0.42, head.y + head.r * 0.1, head.r * 0.9, undefined, a);

      g.restore();

      // Frost glints in the air around it.
      const glint = envelope(clamp01((t - FREEZE_MS) / (TOTAL_MS - FREEZE_MS)), 0.1, 0.25);

      for (let n = 0; n < 5; n++) {
        const k = (time * 0.9 + n / 5) % 1;

        twinkle(g, x + Math.sin(n * 2.4) * H * 0.38, ground - H * (0.2 + ((n * 0.37) % 0.8)), 4 * Math.sin(k * Math.PI), "#ffffff", glint);
      }

      g.globalAlpha = 1;
    });

    void shoot(stage, from, { x, y: ground - 6 }, SPOUT_MS, "#6fd3ff", SPRAY);

    schedule(stage, SPOUT_MS, () => {
      void ring(stage, { x, y: ground }, "#9fe0ff", 700, H * 0.6, 3, 0.25);
      void streakBurst(stage, { x, y: ground }, { colors: SPRAY, count: 14, angle: -Math.PI / 2, cone: 0.7, speed: [120, 260], gravity: 420 });
    });

    schedule(stage, FREEZE_MS, () => {
      void flash(stage, { x, y: ground - H * 0.55 }, "#dff6ff", H * 1.3, 420);
      void streakBurst(stage, { x, y: ground - H * 0.55 }, { colors: ICE, count: 16, speed: [80, 200], gravity: 120, life: [0.3, 0.6] });
    });

    await tween(stage, TOTAL_MS, (k, dt) => {
      t = k * TOTAL_MS;

      // Spray tumbling off the top of the spout.
      if (t > SPOUT_MS && t < FREEZE_MS) {
        const top = ground - H * 1.25 * easeOutCubic(clamp01((t - SPOUT_MS) / 380));

        for (let n = 0; n < 3; n++) emit(stage, { x: x + rand(-H * 0.1, H * 0.1), y: top + rand(0, 10) }, { tints: SPRAY, speed: [40, 120], angle: [-Math.PI, 0], life: [0.4, 0.8], scale: [0.3, 0.06], gravity: 380 });
      }

      // Cold mist rolling off its feet.
      if (t > FREEZE_MS && t < TOTAL_MS - 400 && chance(0.35, dt)) {
        const side = Math.random() < 0.5 ? -1 : 1;

        emit(stage, { x: x + side * rand(0, H * 0.15), y: ground - rand(0, 6) }, { tints: MIST, speed: [15, 40], angle: side < 0 ? [Math.PI * 0.95, Math.PI * 1.05] : [-0.05, 0.05], life: [0.7, 1.1], scale: [0.3, 0.6], drag: 1.2, additive: false, alpha: 0.22 });
      }
    }).then(() => void hide());
  });
