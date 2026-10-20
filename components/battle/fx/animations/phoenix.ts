import type { FxAnimation } from "./types";

import { lightBeam } from "@/components/battle/fx/runtime/beam";
import { clamp01, easeOutCubic } from "@/components/battle/fx/runtime/easing";
import { summonSpot } from "@/components/battle/fx/runtime/figure";
import { bezier, chance, type FxPoint, perTick, rand } from "@/components/battle/fx/runtime/geometry";
import { emit, flash, ring } from "@/components/battle/fx/runtime/primitives";
import { perTarget } from "@/components/battle/fx/runtime/recipes";
import { dropPath, feather } from "@/components/battle/fx/runtime/shapes";
import { schedule, timeline } from "@/components/battle/fx/runtime/stage";
import { streakBurst } from "@/components/battle/fx/runtime/streaks";
import { FLAME } from "@/components/battle/fx/runtime/swatches";
import { glow, spritePx } from "@/components/battle/fx/runtime/texture";
import { ARCHETYPE_FX } from "@/lib/utils/battle/fx";

const THROW_MS = 320;

const RISE_MS = 650;

const CRY_MS = ARCHETYPE_FX.phoenix.impactMs + 250;

const TOTAL_MS = 2700;

const ASH = ["#8a8580", "#6a6560", "#b0aaa2"];

// Wing feathers fanning out from the shoulder when spread: [angle, length] in body units, the right wing.
const PLUMES: [number, number][] = [
  [-1.05, 0.85],
  [-0.75, 1.1],
  [-0.45, 1.2],
  [-0.15, 1.1],
  [0.15, 0.95],
  [0.45, 0.75],
];

function wing(g: CanvasRenderingContext2D, s: number, open: number, flap: number) {
  g.save();
  g.rotate(flap);

  for (const [n, [angle, len]] of PLUMES.entries()) {
    g.save();
    // Folded, every feather hangs down along the body.
    g.rotate(1.3 + (angle - 1.3) * open);
    feather(g, len * s * (0.55 + open * 0.45), n % 2 ? "#ff8a1f" : "#ffb040", "#fff0a0");
    g.restore();
  }

  g.restore();
}

// The firebird seen from the front, wings spread: `s` is half its body height.
function bird(g: CanvasRenderingContext2D, s: number, open: number, flap: number, time: number) {
  spritePx(g, glow("#ff6a00"), 0, 0, s * 3.4, s * 2.6, 0.55);
  g.globalCompositeOperation = "source-over";
  g.lineCap = "round";

  // Burning tail plumes hanging below, waving.
  for (let n = -2; n <= 2; n++) {
    const wave = Math.sin(time * 8 + n * 1.3) * s * 0.12;

    for (const [width, color] of [[s * 0.16, "#ff5a10"], [s * 0.07, "#ffd25a"]] as const) {
      g.strokeStyle = color;
      g.lineWidth = width;
      g.beginPath();
      g.moveTo(0, s * 0.25);
      g.quadraticCurveTo(n * s * 0.12 + wave, s * 0.7, n * s * 0.3 + wave * 1.5, s * (1.25 - Math.abs(n) * 0.15));
      g.stroke();
    }
  }

  for (const side of [-1, 1]) {
    g.save();
    g.translate(side * s * 0.1, -s * 0.12);
    g.scale(side, 1);
    wing(g, s, open, -flap);
    g.restore();
  }

  const body = g.createLinearGradient(0, s * 0.35, 0, -s * 0.5);

  body.addColorStop(0, "#ff4a00");
  body.addColorStop(0.6, "#ffa030");
  body.addColorStop(1, "#fff0a0");
  g.fillStyle = body;
  g.beginPath();
  g.ellipse(0, 0, s * 0.15, s * 0.34, 0, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.arc(0, -s * 0.42, s * 0.12, 0, Math.PI * 2);
  g.fill();

  // A crest of flame tongues.
  for (let n = -1; n <= 1; n++) {
    g.save();
    g.translate(n * s * 0.06, -s * 0.5);
    g.rotate(n * 0.35);
    g.fillStyle = n ? "#ff8a1f" : "#ffd25a";
    dropPath(g, 0, 0, s * 0.05, 3.2 + Math.sin(time * 14 + n) * 0.6);
    g.fill();
    g.restore();
  }

  g.fillStyle = "#ffe08a";
  g.beginPath();
  g.moveTo(-s * 0.04, -s * 0.38);
  g.lineTo(0, -s * 0.26);
  g.lineTo(s * 0.04, -s * 0.38);
  g.closePath();
  g.fill();
  g.fillStyle = "#ffffff";

  for (const side of [-1, 1]) {
    g.beginPath();
    g.arc(side * s * 0.05, -s * 0.44, s * 0.022, 0, Math.PI * 2);
    g.fill();
  }
}

export const phoenix: FxAnimation = ({ stage, from, targets }) =>
  perTarget(stage, targets, 0, async ({ at: target, el }) => {
    const { x, ground, height: H } = summonSpot(el, target);

    const dir = x < stage.layer.clientWidth / 2 ? 1 : -1;

    const S = Math.max(24, H * 0.42);

    const start = { x, y: ground - H * 0.2 };

    const peak = { x, y: Math.max(S * 1.6, ground - H * 1.05) };

    const away = { x: x + dir * H * 1.3, y: peak.y - H * 0.6 };

    const embers: FxPoint[] = Array.from({ length: 6 }, () => ({ x: rand(-10, 10), y: rand(-8, 8) }));

    let pos = start;

    let tilt = 0;

    const run = timeline(
      stage,
      TOTAL_MS,
      (g, t) => {
        const time = t / 1000;

        // A handful of embers thrown down at the caster's feet.
        const thrown = clamp01(t / THROW_MS);

        if (thrown < 1) {
          for (const e of embers) {
            const p = bezier(from, { x: (from.x + x) / 2, y: Math.min(from.y, ground) - 30 }, { x: x + e.x, y: ground }, thrown);

            spritePx(g, glow("#ff8a1f"), p.x + e.x * thrown, p.y + e.y * (1 - thrown), 10, undefined, 0.9);
          }
        }

        // The column of flame over the battlefield.
        const pillar = clamp01((t - THROW_MS) / 220) * (1 - clamp01((t - RISE_MS - 400) / 500));

        if (pillar > 0) {
          lightBeam(g, x, Math.max(-20, ground - H * 1.9), ground + 4, H * 0.3, pillar * 0.8, "255,110,25", 0.3);
          lightBeam(g, x, Math.max(-20, ground - H * 1.5), ground, H * 0.1, pillar * 0.7, "255,235,160", 0.3);
          spritePx(g, glow("#ff5a10"), x, ground, H * 1.2, H * 0.25, pillar * 0.8);
        }

        const fly = clamp01((t - RISE_MS) / (TOTAL_MS - RISE_MS - 250));

        if (fly <= 0 || fly >= 1) return;

        const open = easeOutCubic(clamp01((t - RISE_MS - 150) / 450));

        const flap = Math.sin(time * 13) * 0.45 * open;

        const fade = 1 - clamp01((fly - 0.82) / 0.18);

        g.save();
        g.translate(pos.x, pos.y);
        g.rotate(tilt);
        g.globalAlpha = fade;
        bird(g, S * (0.6 + 0.4 * clamp01(fly / 0.3)), open, flap, time);
        g.restore();
        g.globalAlpha = 1;
      },
      (t, dt) => {
        const fly = clamp01((t - RISE_MS) / (TOTAL_MS - RISE_MS - 250));

        if (t > THROW_MS && t < RISE_MS + 300) perTick(2, dt, () => emit(stage, { x: x + rand(-H * 0.2, H * 0.2), y: ground - rand(0, H * 0.6) }, { tints: FLAME, speed: [80, 200], angle: [-Math.PI * 0.6, -Math.PI * 0.4], life: [0.4, 0.8], scale: [0.6, 0.08], gravity: -140 }));

        if (fly <= 0 || fly >= 1) return;

        // Up out of the fire, hovering for its cry, then away over the field.
        const glide = clamp01((fly - 0.62) / 0.38);

        pos = glide > 0 ? bezier(peak, { x: peak.x + dir * H * 0.3, y: peak.y }, away, glide * glide) : { x, y: start.y + (peak.y - start.y) * easeOutCubic(clamp01(fly / 0.4)) + Math.sin(fly * 30) * 2 };
        tilt = dir * glide * 0.5;

        if (chance(0.7, dt)) emit(stage, { x: pos.x + rand(-S * 0.3, S * 0.3), y: pos.y + S * rand(0.6, 1.1) }, { tints: FLAME, speed: [10, 40], angle: [Math.PI * 0.3, Math.PI * 0.7], life: [0.3, 0.6], scale: [0.22, 0.04], gravity: -60 });

        // Its fire burns down to ash at the end: even death only sends it back for a moment.
        if (fly > 0.8) perTick(2, dt, () => emit(stage, { x: pos.x + rand(-S * 0.4, S * 0.4), y: pos.y + rand(-S * 0.2, S * 0.2) }, { tints: ASH, speed: [10, 30], angle: [Math.PI * 0.3, Math.PI * 0.7], life: [0.6, 1], scale: [0.2, 0.08], gravity: 40, additive: false, alpha: 0.8 }));
      },
    );

    schedule(stage, THROW_MS, () => {
      void flash(stage, { x, y: ground - H * 0.4 }, "#ff8a1f", H * 1.8, 520);
      void ring(stage, { x, y: ground }, "#ffb040", 700, H * 0.8, 3, 0.25);
      void streakBurst(stage, { x, y: ground }, { colors: FLAME, count: 20, angle: -Math.PI / 2, cone: 0.8, speed: [160, 340], gravity: 260 });
    });

    // The cry: rings of sound and a flare from the beak.
    schedule(stage, CRY_MS, () => {
      void flash(stage, pos, "#ffd25a", S * 2.4, 450);

      for (let n = 0; n < 3; n++) schedule(stage, n * 110, () => void ring(stage, { x: pos.x, y: pos.y - S * 0.4 }, "#ffe08a", 520, S * (0.9 + n * 0.3), 2));
    });

    await run;
  });
