import type { FxAnimation } from "./types";

import { lightBeam } from "@/components/battle/fx/runtime/beam";
import { clamp01, easeOutCubic, envelope } from "@/components/battle/fx/runtime/easing";
import { figureHead, figurePath, summonSpot } from "@/components/battle/fx/runtime/figure";
import { chance, type FxPoint, perTick, rand } from "@/components/battle/fx/runtime/geometry";
import { emit, flash, ring } from "@/components/battle/fx/runtime/primitives";
import { perTarget } from "@/components/battle/fx/runtime/recipes";
import { dropPath } from "@/components/battle/fx/runtime/shapes";
import { schedule, timeline } from "@/components/battle/fx/runtime/stage";
import { streakBurst } from "@/components/battle/fx/runtime/streaks";
import { FLAME } from "@/components/battle/fx/runtime/swatches";
import { glow, spritePx } from "@/components/battle/fx/runtime/texture";
import { ARCHETYPE_FX } from "@/lib/utils/battle/fx";

const ERUPT_MS = 320;

const FORM_MS = ARCHETYPE_FX.firesummon.impactMs;

const TOTAL_MS = 2600;

// [x, y, radius] as fractions of the height, plus a phase.
const TONGUES: [number, number, number, number][] = [
  [-0.06, -0.93, 0.045, 0],
  [0, -0.96, 0.055, 1],
  [0.06, -0.93, 0.045, 2],
  [-0.2, -0.75, 0.04, 3],
  [0.2, -0.75, 0.04, 4],
];

const EMBER = ["#ffd25a", "#ff8a1f", "#ff5a10"];

interface Spot {
  x: number;
  ground: number;
  H: number;
}

/** The ember falls from the caster's hand to the ground beside them, `drop` of the way. */
function fallingEmber(g: CanvasRenderingContext2D, from: FxPoint, { x, ground }: Spot, drop: number) {
  const ex = from.x + (x - from.x) * drop;

  const ey = from.y + (ground - from.y) * drop * drop - Math.sin(drop * Math.PI) * 18;

  spritePx(g, glow("#ff8a1f"), ex, ey, 18, undefined, 0.9);
  spritePx(g, glow("#fff3b0"), ex, ey, 7, undefined, 1);
}

/** Scorched ground: a glowing ellipse that leaves a dark burn. */
function scorch(g: CanvasRenderingContext2D, { x, ground, H }: Spot, t: number) {
  const heat = envelope(clamp01((t - ERUPT_MS) / (TOTAL_MS - ERUPT_MS)), 0.05, 0.3);

  g.globalCompositeOperation = "source-over";
  g.globalAlpha = 0.55 * heat;
  g.fillStyle = "#1a0802";
  g.beginPath();
  g.ellipse(x, ground, H * 0.42, H * 0.07, 0, 0, Math.PI * 2);
  g.fill();
  spritePx(g, glow("#ff5a10"), x, ground, H * 1.1, H * 0.22, 0.8 * heat);
}

/** The pillar of fire roars up, then draws into the body. */
function firePillar(g: CanvasRenderingContext2D, { x, ground, H }: Spot, t: number, erupt: number, pillar: number) {
  const width = H * 0.32 * (1 - clamp01((t - FORM_MS) / 500) * 0.6);

  lightBeam(g, x, ground - H * 1.5 * easeOutCubic(erupt), ground + 4, width, pillar * 0.95, "255,120,30", 0.25);
  lightBeam(g, x, ground - H * 1.2 * easeOutCubic(erupt), ground, width * 0.45, pillar * 0.8, "255,230,140", 0.3);
}

/** A crown of flame tongues on the head and shoulders (in the figure's frame). */
function flameCrown(g: CanvasRenderingContext2D, H: number, time: number, body: number) {
  g.globalCompositeOperation = "source-over";

  for (const [tx, ty, size, n] of TONGUES) {
    const flick = 1 + Math.sin(time * 15 + n * 2.1) * 0.25;

    g.globalAlpha = body * 0.9;
    g.fillStyle = n % 2 ? "#ff8a1f" : "#ffb040";
    dropPath(g, tx * H + Math.sin(time * 11 + n) * H * 0.01, ty * H, size * H, 2.6 * flick);
    g.fill();
  }
}

/** The flame squeezed into a man: licking outline, hot core, flame crown, white-hot eyes; `lean` turns it to the caster. */
function flameMan(g: CanvasRenderingContext2D, { x, ground, H }: Spot, t: number, body: number, look: { lean: number; fill: CanvasGradient }) {
  const time = t / 1000;

  const head = figureHead(H);

  const lick = (p: { x: number; y: number }, n: number) => {
    const up = -p.y / H;

    return { x: p.x + Math.sin(time * 13 + n * 1.9) * H * 0.018, y: p.y - Math.abs(Math.sin(time * 9 + n * 2.3)) * H * 0.06 * up };
  };

  g.save();
  g.translate(x, ground);
  g.transform(1, 0, look.lean, 1, 0, 0);
  spritePx(g, glow("#ff5a00"), 0, -H * 0.5, H * 1.1, H * 1.4, 0.75 * body);
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = body;
  g.fillStyle = look.fill;
  figurePath(g, H, { armLift: 0.15 }, lick);
  g.fill();
  g.globalCompositeOperation = "lighter";
  g.globalAlpha = body * (0.4 + Math.sin(time * 17) * 0.08);
  g.fillStyle = "#ffe08a";
  g.save();
  g.translate(0, -H * 0.08);
  g.scale(0.55, 0.8);
  figurePath(g, H, {}, lick);
  g.fill();
  g.restore();
  flameCrown(g, H, time, body);

  const eyes = clamp01((t - FORM_MS - 250) / 200);

  g.globalCompositeOperation = "lighter";

  for (const side of [-1, 1]) spritePx(g, glow("#ffffff"), head.x + side * head.r * 0.42, head.y + head.r * 0.1, head.r * 0.8 * eyes, undefined, body);

  g.restore();
}

export const firesummon: FxAnimation = ({ stage, from, targets }) =>
  perTarget(stage, targets, 0, async ({ at: target, el }) => {
    const { x, ground, height: H } = summonSpot(el, target);

    const steps = [-1, 1].map((side) => ({ x: x + side * H * 0.1, y: ground }));

    const at: Spot = { x, ground, H };

    const fill = stage.g.createLinearGradient(0, 0, 0, -H);

    fill.addColorStop(0, "rgba(160,30,0,0.9)");
    fill.addColorStop(0.35, "rgba(255,90,10,0.95)");
    fill.addColorStop(0.75, "rgba(255,170,40,0.95)");
    fill.addColorStop(1, "rgba(255,230,140,0.95)");

    const run = timeline(
      stage,
      TOTAL_MS,
      (g, t) => {
        const drop = clamp01(t / ERUPT_MS);

        if (drop < 1) fallingEmber(g, from, at, drop);

        const erupt = clamp01((t - ERUPT_MS) / 260);

        const pillar = erupt * (1 - clamp01((t - FORM_MS) / 600));

        if (erupt > 0) scorch(g, at, t);

        if (pillar > 0) firePillar(g, at, t, erupt, pillar);

        const body = clamp01((t - FORM_MS + 300) / 500) * (1 - clamp01((t - TOTAL_MS + 450) / 450));

        if (body <= 0) return;

        // It turns to the caster beside it: a slight lean towards the portrait.
        const lean = Math.sin(clamp01((t - 1500) / 500) * Math.PI * 0.5) * 0.08 * Math.sign(x - target.x);

        flameMan(g, at, t, body, { lean, fill });
        g.globalAlpha = 1;
      },
      (t, dt) => {
        if (t > ERUPT_MS && t < FORM_MS + 200) perTick(4, dt, () => emit(stage, { x: x + rand(-H * 0.18, H * 0.18), y: ground - rand(0, H * 0.5) }, { tints: FLAME, speed: [60, 160], angle: [-Math.PI * 0.6, -Math.PI * 0.4], life: [0.4, 0.8], scale: [0.6, 0.08], gravity: -120 }));

        // Flames lick off the head and shoulders; the footsteps keep smouldering.
        if (t > FORM_MS && t < TOTAL_MS - 300) {
          if (chance(0.8, dt)) emit(stage, { x: x + rand(-H * 0.2, H * 0.2), y: ground - H * rand(0.65, 0.95) }, { tints: FLAME, speed: [30, 80], angle: [-Math.PI * 0.6, -Math.PI * 0.4], life: [0.3, 0.6], scale: [0.4, 0.05], gravity: -90 });

          if (chance(0.3, dt)) {
            const step = steps[Math.floor(Math.random() * 2)];

            emit(stage, { x: step.x + rand(-3, 3), y: step.y }, { tints: EMBER, speed: [10, 40], angle: [-Math.PI * 0.7, -Math.PI * 0.3], life: [0.4, 0.8], scale: [0.25, 0.04], gravity: -40 });
          }
        }

        // It ends in a gust of embers.
        if (t > TOTAL_MS - 450) perTick(3, dt, () => emit(stage, { x: x + rand(-H * 0.2, H * 0.2), y: ground - rand(0, H) }, { tints: EMBER, speed: [20, 70], angle: [-Math.PI * 0.8, -Math.PI * 0.2], life: [0.5, 0.9], scale: [0.25, 0.04], gravity: -60 }));
      },
    );

    schedule(stage, ERUPT_MS, () => {
      void flash(stage, { x, y: ground - H * 0.3 }, "#ff8a1f", H * 1.6, 500);
      void ring(stage, { x, y: ground }, "#ffb040", 700, H * 0.7, 3, 0.25);
      void streakBurst(stage, { x, y: ground }, { colors: EMBER, count: 18, angle: -Math.PI / 2, cone: 0.9, speed: [140, 320], gravity: 260 });
    });

    schedule(stage, FORM_MS, () => {
      void flash(stage, { x, y: ground - H * 0.55 }, "#ffd25a", H * 1.2, 450);
    });

    await run;
  });
