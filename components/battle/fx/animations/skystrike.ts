import type { FxAnimation } from "./types";

import { clamp01, easeOutCubic } from "@/components/battle/fx/runtime/easing";
import { type FxPoint, type FxTarget, perTick, rand, zigzag } from "@/components/battle/fx/runtime/geometry";
import { emit } from "@/components/battle/fx/runtime/primitives";
import { burst, impactSplash, perTarget } from "@/components/battle/fx/runtime/recipes";
import { cloudPath, polyline } from "@/components/battle/fx/runtime/shapes";
import { animateEl, timeline } from "@/components/battle/fx/runtime/stage";
import { streakBurst } from "@/components/battle/fx/runtime/streaks";
import { glow, sprite } from "@/components/battle/fx/runtime/texture";
import { ARCHETYPE_FX } from "@/lib/utils/battle/fx";

const STRIKE_MS = ARCHETYPE_FX.skystrike.impactMs;

const TOTAL_MS = 1500;

const FLICKER_MS = 90;

const SHAKE: Keyframe[] = [{ transform: "none" }, { transform: "translate(-7px, 3px)" }, { transform: "translate(6px, -4px)" }, { transform: "translate(-4px, 2px)" }, { transform: "translate(2px, -1px)" }, { transform: "none" }];

interface Bolt {
  at: number;
  power: number;
  trunk: FxPoint[];
  forks: FxPoint[][];
}

function makeBolt(top: FxPoint, target: FxPoint, at: number, power: number): Bolt {
  const length = Math.hypot(target.x - top.x, target.y - top.y);

  const trunk = zigzag(top, target, 18, Math.max(10, length * 0.035));

  const forks = [6, 10, 13].map((i) => {
    const from = trunk[i];

    const side = rand(0, 1) < 0.5 ? -1 : 1;

    return zigzag(from, { x: from.x + side * rand(40, 90), y: from.y + rand(30, 80) }, 6, 9);
  });

  return { at, power, trunk, forks };
}

/** Біле ядро, кольорове сяйво й широкий ореол — три проходи, як справжній розряд. */
function drawBolt(g: CanvasRenderingContext2D, bolt: Bolt, color: string, accent: string, alpha: number) {
  g.save();
  g.globalCompositeOperation = "lighter";
  g.lineJoin = "round";
  g.lineCap = "round";

  const pass = (pts: FxPoint[], width: number) => {
    g.globalAlpha = alpha * 0.22;
    g.strokeStyle = color;
    g.lineWidth = width * 7;
    polyline(g, pts);
    g.globalAlpha = alpha * 0.6;
    g.strokeStyle = accent;
    g.lineWidth = width * 2.6;
    polyline(g, pts);
    g.globalAlpha = alpha;
    g.strokeStyle = "#ffffff";
    g.lineWidth = width;
    polyline(g, pts);
  };

  pass(bolt.trunk, 3.2 * bolt.power);
  for (const fork of bolt.forks) pass(fork, 1.4 * bolt.power);
  g.restore();
}

async function strike({ stage, palette, spec }: Parameters<FxAnimation>[0], target: FxTarget, first: boolean) {
  const at = target.at;

  const top = { x: at.x + rand(-60, 60), y: -30 };

  // хмара над ціллю може частково піти за верхній край — так і задумано: удар іде «з-за кадру»
  const cloudY = at.y - 150;

  const bolts = [0, 110, 230, ...(spec.critical ? [350] : [])].map((t, i) => makeBolt(top, at, STRIKE_MS + t, i === 0 ? 1.25 : 0.8));

  const arcs = Array.from({ length: 6 }, () => {
    const a = rand(0, Math.PI * 2);

    return zigzag({ x: at.x, y: at.y - 6 }, { x: at.x + Math.cos(a) * rand(28, 50), y: at.y + Math.sin(a) * rand(14, 26) }, 5, 6);
  });

  const halo = glow(palette.core);

  const white = glow("#ffffff");

  let struck = false;

  await timeline(
    stage,
    TOTAL_MS,
    (g, t) => {
      const gather = clamp01(t / STRIKE_MS);

      const after = t - STRIKE_MS;

      const leave = 1 - clamp01((t - 1050) / 450);

      g.globalCompositeOperation = "source-over";

      // темне небо одне на каст (цілі б'ються разом): кілька шарів дали б майже чорний екран
      if (first) {
        g.globalAlpha = 0.32 * gather * leave;
        g.fillStyle = "#04060e";
        g.fillRect(0, 0, g.canvas.width, g.canvas.height);
      }

      g.globalAlpha = 0.85 * gather * leave;
      g.fillStyle = "#151b2e";
      cloudPath(g, at.x, cloudY, 220);
      g.fill();
      g.fillStyle = "#222b45";
      cloudPath(g, at.x + 40, cloudY - 18, 160);
      g.fill();

      if (t < STRIKE_MS && Math.floor(t / 70) % 3 === 0) sprite(g, halo, at.x + rand(-60, 60), cloudY, 2.2, 1.2, 0.6);

      for (const bolt of bolts) {
        const k = t - bolt.at;

        if (k >= 0 && k < FLICKER_MS && Math.floor(k / 30) % 3 !== 1) drawBolt(g, bolt, palette.core, palette.accent, 1);
      }

      if (after >= 0) {
        const fade = 1 - clamp01(after / 600);

        // спалах трохи після розряду — інакше стовбур тоне в білому
        sprite(g, white, at.x, at.y, 2.6 + easeOutCubic(clamp01(after / 300)) * 1.6, undefined, fade * clamp01((after - 40) / 60));
        sprite(g, halo, at.x, at.y, 5, undefined, fade * 0.6);

        g.globalCompositeOperation = "lighter";
        g.globalAlpha = 1 - clamp01(after / 500);
        g.strokeStyle = palette.accent;
        g.lineWidth = 4 * (1 - clamp01(after / 500)) + 1;
        g.beginPath();

        const r = 12 + easeOutCubic(clamp01(after / 500)) * 110;

        g.ellipse(at.x, at.y + 18, r, r * 0.32, 0, 0, Math.PI * 2);
        g.stroke();

        g.globalCompositeOperation = "source-over";
        g.globalAlpha = 0.5 * (1 - clamp01((after - 500) / 500));
        g.fillStyle = "#120a05";
        g.beginPath();
        g.ellipse(at.x, at.y + 18, 30, 10, 0, 0, Math.PI * 2);
        g.fill();
      }

      if (after > 120 && after < 900) {
        arcs.forEach((arc, i) => {
          if (Math.floor((t + i * 37) / 60) % 3 === 0) drawBolt(g, { at: 0, power: 0.35, trunk: arc, forks: [] }, palette.core, palette.accent, 0.9);
        });
      }

      g.globalAlpha = 1;
      g.globalCompositeOperation = "source-over";
    },
    (t, dt) => {
      if (t < STRIKE_MS) perTick(2, dt, () => emit(stage, { x: at.x + rand(-80, 80), y: cloudY + rand(-10, 20) }, { tints: palette.tints, speed: [5, 25], life: [0.2, 0.4], scale: [0.5, 0.05] }));

      if (struck || t < STRIKE_MS) return;

      struck = true;
      void animateEl(stage, target.el?.closest("[data-fx-clip]") ?? target.el, SHAKE, { duration: spec.critical ? 420 : 340 });
      void impactSplash(stage, at, palette, { flash: spec.critical ? 150 : 120, flashMs: 400, sheetScale: spec.critical ? 2.4 : 2 });
      burst(stage, at, palette.tints, spec.critical ? 70 : 50, { speed: [80, 380], life: [0.3, 0.8], gravity: 260 });
      void streakBurst(stage, at, { colors: ["#ffffff", ...palette.tints], count: spec.critical ? 26 : 18, speed: [180, 420], life: [0.18, 0.4], gravity: 500, width: [1, 2] });
    },
  );
}

/** Блискавка з неба: небо темніє, хмара збирає заряд, три розряди з відгалуженнями від верхнього краю в ціль, спалах, струс карти, іскри й тріск навколо. */
export const skystrike: FxAnimation = (run) => perTarget(run.stage, run.targets, ARCHETYPE_FX.skystrike.staggerMs, (target, i) => strike(run, target, i === 0));
