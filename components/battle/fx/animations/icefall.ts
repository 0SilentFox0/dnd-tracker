import type { FxAnimation } from "./types";

import { clamp01, easeOutCubic } from "@/components/battle/fx/runtime/easing";
import { type FxPoint, type FxTarget, perTick, rand } from "@/components/battle/fx/runtime/geometry";
import { type Debris, stepBodies } from "@/components/battle/fx/runtime/physics";
import { emit } from "@/components/battle/fx/runtime/primitives";
import { burst, impactSplash, perTarget } from "@/components/battle/fx/runtime/recipes";
import { jaggedShape, polyPath } from "@/components/battle/fx/runtime/shapes";
import { animateEl, timeline } from "@/components/battle/fx/runtime/stage";
import { streakBurst } from "@/components/battle/fx/runtime/streaks";
import { glow, sprite } from "@/components/battle/fx/runtime/texture";
import { ARCHETYPE_FX } from "@/lib/utils/battle/fx";

const IMPACT_MS = ARCHETYPE_FX.icefall.impactMs;

const TOTAL_MS = 1600;

const APPEAR_MS = 150;

const MIST = ["#eaf8ff", "#d6f0ff", "#ffffff"];

const SHAKE: Keyframe[] = [{ transform: "none" }, { transform: "translate(0, 8px)" }, { transform: "translate(-6px, -4px)" }, { transform: "translate(5px, 3px)" }, { transform: "translate(-2px, -1px)" }, { transform: "none" }];

interface Shard extends Debris {
  rot: number;
  spin: number;
  shape: FxPoint[];
}

/** Кристал вістрям униз: центральний «олівець» і бічні уламки, грані світлі зверху й темні знизу. */
function drawCrystal(g: CanvasRenderingContext2D, x: number, y: number, s: number, palette: { core: string; tints: string[] }, alpha: number) {
  const prisms: Array<[number, number, number, number]> = [
    [0, 0, 1, 0],
    [-0.42, 0.12, 0.62, -0.35],
    [0.44, 0.08, 0.66, 0.32],
    [-0.18, -0.3, 0.5, -0.12],
    [0.22, -0.28, 0.48, 0.18],
  ];

  g.globalCompositeOperation = "source-over";
  g.globalAlpha = alpha;

  for (const [dx, dy, k, tilt] of prisms) {
    const w = 16 * s * k;

    const h = 46 * s * k;

    g.save();
    g.translate(x + dx * 30 * s, y + dy * 30 * s);
    g.rotate(tilt);

    const grad = g.createLinearGradient(-w, -h, w, h);

    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.45, palette.tints[1] ?? "#c8f1ff");
    grad.addColorStop(1, palette.tints[3] ?? palette.core);
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(0, -h);
    g.lineTo(w, -h * 0.35);
    g.lineTo(w * 0.7, h * 0.35);
    g.lineTo(0, h);
    g.lineTo(-w * 0.7, h * 0.35);
    g.lineTo(-w, -h * 0.35);
    g.closePath();
    g.fill();
    g.strokeStyle = "rgba(255,255,255,0.85)";
    g.lineWidth = 1.2;
    g.stroke();
    g.beginPath();
    g.moveTo(0, -h);
    g.lineTo(0, h);
    g.moveTo(-w, -h * 0.35);
    g.lineTo(w * 0.7, h * 0.35);
    g.strokeStyle = "rgba(255,255,255,0.35)";
    g.stroke();
    g.restore();
  }
}

async function fall({ stage, palette, spec }: Parameters<FxAnimation>[0], target: FxTarget) {
  const at = target.at;

  const ground = at.y + 16;

  const start = { x: at.x + 30, y: Math.max(-40, at.y - 220) };

  const halo = glow(palette.core);

  const white = glow("#ffffff");

  let pos = start;

  let size = 2.4;

  let landed = false;

  const shards: Shard[] = [];

  const spikeCount = spec.critical ? 12 : 9;

  const spikes = Array.from({ length: spikeCount }, (_, i) => {
    const a = (i / spikeCount) * Math.PI * 2 + rand(-0.2, 0.2);

    return { x: at.x + Math.cos(a) * rand(30, 46), y: ground + Math.sin(a) * rand(10, 16), h: rand(26, 46), w: rand(7, 11), lean: Math.cos(a) * 0.35 };
  });

  await timeline(
    stage,
    TOTAL_MS,
    (g, t) => {
      const after = t - IMPACT_MS;

      const leave = 1 - clamp01((t - 1150) / 450);

      g.globalCompositeOperation = "source-over";
      g.globalAlpha = 0.22 * clamp01(t / 300) * leave;
      g.fillStyle = "#021019";
      g.fillRect(0, 0, g.canvas.width, g.canvas.height);

      if (!landed) {
        const near = clamp01((t - APPEAR_MS) / (IMPACT_MS - APPEAR_MS));

        g.globalAlpha = 0.45 * near;
        g.fillStyle = "#000000";
        g.beginPath();
        g.ellipse(at.x, ground, 18 + near * 26, (18 + near * 26) * 0.32, 0, 0, Math.PI * 2);
        g.fill();

        if (t > APPEAR_MS) {
          sprite(g, halo, pos.x, pos.y, 3.2 * size, undefined, 0.55);
          drawCrystal(g, pos.x, pos.y, size, palette, clamp01((t - APPEAR_MS) / 120));
        }
      }

      if (after >= 0) {
        const k = clamp01(after / 600);

        sprite(g, white, at.x, at.y, 2.4 + easeOutCubic(k) * 1.6, undefined, 1 - k);
        sprite(g, halo, at.x, at.y, 5, undefined, (1 - k) * 0.7);

        g.globalCompositeOperation = "lighter";
        g.globalAlpha = 1 - clamp01(after / 550);
        g.strokeStyle = palette.tints[0] ?? "#ffffff";
        g.lineWidth = 5 * (1 - clamp01(after / 550)) + 1;
        g.beginPath();

        const r = 14 + easeOutCubic(clamp01(after / 550)) * 120;

        g.ellipse(at.x, ground, r, r * 0.32, 0, 0, Math.PI * 2);
        g.stroke();

        g.globalCompositeOperation = "source-over";
        g.globalAlpha = 0.55 * (1 - clamp01((after - 450) / 450));
        g.fillStyle = palette.tints[1] ?? "#c8f1ff";
        g.beginPath();
        g.ellipse(at.x, ground, 40, 13, 0, 0, Math.PI * 2);
        g.fill();

        const grow = easeOutCubic(clamp01(after / 140));

        const sink = clamp01((after - 550) / 300);

        for (const sp of spikes) {
          const h = sp.h * grow * (1 - sink);

          if (h < 1) continue;

          g.globalAlpha = 0.95;

          const grad = g.createLinearGradient(sp.x, sp.y - h, sp.x, sp.y);

          grad.addColorStop(0, "#ffffff");
          grad.addColorStop(1, palette.tints[2] ?? palette.core);
          g.fillStyle = grad;
          g.beginPath();
          g.moveTo(sp.x - sp.w / 2, sp.y);
          g.lineTo(sp.x + sp.lean * h, sp.y - h);
          g.lineTo(sp.x + sp.w / 2, sp.y);
          g.closePath();
          g.fill();
          g.strokeStyle = "rgba(255,255,255,0.8)";
          g.lineWidth = 1;
          g.stroke();
        }

        g.globalAlpha = 1 - clamp01((after - 600) / 300);

        for (const s of shards) {
          g.save();
          g.translate(s.x, s.y);
          g.rotate(s.rot);
          polyPath(g, s.shape);
          g.fillStyle = palette.tints[1] ?? "#c8f1ff";
          g.fill();
          g.strokeStyle = "#ffffff";
          g.lineWidth = 1;
          g.stroke();
          g.restore();
        }
      }

      g.globalAlpha = 1;
      g.globalCompositeOperation = "source-over";
    },
    (t, dt) => {
      if (!landed) {
        const k = clamp01((t - APPEAR_MS) / (IMPACT_MS - APPEAR_MS));

        const e = k * k;

        pos = { x: start.x + (at.x - start.x) * e, y: start.y + (at.y - 8 - start.y) * e };
        size = 2.4 - 1.35 * e;

        if (t > 300) perTick(2, dt, () => emit(stage, { x: at.x + rand(-60, 60), y: ground + rand(-10, 6) }, { tints: MIST, speed: [5, 20], life: [0.5, 0.9], scale: [0.6, 1.4], additive: false, alpha: 0.3, gravity: -15 }));

        if (t > APPEAR_MS) perTick(3, dt, () => emit(stage, pos, { tints: MIST, speed: [10, 40], life: [0.3, 0.6], scale: [0.9 * size, 0.2], spread: 10 * size, additive: false, alpha: 0.35 }));
      }

      if (!landed && t >= IMPACT_MS) {
        landed = true;
        void animateEl(stage, target.el?.closest("[data-fx-clip]") ?? target.el, SHAKE, { duration: spec.critical ? 460 : 380 });
        void impactSplash(stage, at, palette, { flash: spec.critical ? 150 : 120, flashMs: 400, sheetScale: spec.critical ? 2.4 : 2 });

        for (let i = 0; i < (spec.critical ? 26 : 18); i++) {
          const a = rand(-Math.PI * 0.95, -Math.PI * 0.05);

          const speed = rand(160, 360);

          shards.push({ x: at.x, y: at.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, rot: rand(0, 6), spin: rand(-14, 14), shape: jaggedShape(4, rand(3, 7), 0.5, 0.4) });
        }

        burst(stage, at, ["#ffffff", ...palette.tints], spec.critical ? 60 : 40, { speed: [60, 300], life: [0.4, 0.9], gravity: 120 });
        void streakBurst(stage, at, { colors: ["#ffffff", palette.tints[1] ?? "#c8f1ff"], count: spec.critical ? 22 : 14, speed: [160, 360], life: [0.2, 0.4], gravity: 400, width: [1, 2] });

        for (let n = 0; n < 16; n++) emit(stage, { x: at.x, y: ground }, { tints: MIST, speed: [40, 140], angle: [-Math.PI, 0], life: [0.6, 1.1], scale: [0.8, 2], drag: 2, additive: false, alpha: 0.5, gravity: -10 });
      }

      if (landed) stepBodies(shards, dt, 900, ground + 6);
    },
  );
}

/** Крижаний болт: над ціллю збирається іній, кристал падає згори й меншає (віддаляється вглиб), удар — спалах, струс, уламки, шипи з землі, хвиля інею. */
export const icefall: FxAnimation = (run) => perTarget(run.stage, run.targets, ARCHETYPE_FX.icefall.staggerMs, (target) => fall(run, target));
