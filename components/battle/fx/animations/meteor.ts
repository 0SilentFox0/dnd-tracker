import { easeOutCubic } from "../runtime/easing";
import { chance, type Debris, type FxPoint, perTick, rand, stepBodies } from "../runtime/geometry";
import { emit } from "../runtime/primitives";
import { burst, impactSplash, perTarget } from "../runtime/recipes";
import { jaggedShape, polyPath } from "../runtime/shapes";
import { show, tween } from "../runtime/stage";
import { glow, sprite } from "../runtime/texture";
import type { FxAnimation } from "./types";

import { ARCHETYPE_FX } from "@/lib/utils/battle/fx";

interface Rock extends Debris {
  rot: number;
  spin: number;
  shape: FxPoint[];
}

const FALL_MS = ARCHETYPE_FX.meteor.impactMs;

const AFTER_MS = 800;

const SMOKE = ["#3a2a22", "#4a3a30", "#2a201a"];

const rockShape = (size: number) => jaggedShape(7, size, 0.25, 0.7);

async function strike({ stage, palette, spec }: Parameters<FxAnimation>[0], target: FxPoint) {
  const start = { x: target.x - Math.max(140, (target.y + 80) * 0.42), y: -80 };

  const core = rockShape(spec.critical ? 13 : 10);

  let pos = start;

  let spin = 0;

  const head = glow(palette.core);

  const hot = glow(palette.tints[0] ?? "#ffffff");

  const angle = Math.atan2(target.y - start.y, target.x - start.x);

  const hideHead = show(stage, (g) => {
    const tail = 70;

    const grad = g.createLinearGradient(pos.x - Math.cos(angle) * tail, pos.y - Math.sin(angle) * tail, pos.x, pos.y);

    grad.addColorStop(0, "rgba(255,90,0,0)");
    grad.addColorStop(1, "rgba(255,200,90,0.85)");
    g.globalAlpha = 1;
    g.globalCompositeOperation = "lighter";
    g.strokeStyle = grad;
    g.lineCap = "round";
    g.lineWidth = spec.critical ? 18 : 14;
    g.beginPath();
    g.moveTo(pos.x - Math.cos(angle) * tail, pos.y - Math.sin(angle) * tail);
    g.lineTo(pos.x, pos.y);
    g.stroke();
    sprite(g, head, pos.x, pos.y, 1.5);
    sprite(g, hot, pos.x, pos.y, 0.7);

    g.save();
    g.globalCompositeOperation = "source-over";
    g.translate(pos.x, pos.y);
    g.rotate(spin);
    polyPath(g, core);
    g.fillStyle = "#3a2216";
    g.fill();
    g.strokeStyle = "#ffb347";
    g.lineWidth = 1.6;
    g.stroke();
    g.restore();
  });

  await tween(stage, FALL_MS, (k, dt) => {
    const e = k ** 1.7;

    pos = { x: start.x + (target.x - start.x) * e, y: start.y + (target.y - start.y) * e };
    spin = k * 6;

    perTick(3, dt, () => emit(stage, pos, { tints: palette.tints, speed: [10, 60], life: [0.25, 0.55], scale: [0.6, 0.06], spread: 6, drag: 1.5 }));

    if (chance(0.5, dt)) emit(stage, pos, { tints: SMOKE, speed: [5, 20], life: [0.5, 0.9], scale: [0.5, 1.3], spread: 4, additive: false, alpha: 0.5, gravity: -20 });
  });
  hideHead();

  const rocks: Rock[] = Array.from({ length: spec.critical ? 12 : 8 }, () => {
    const a = rand(-Math.PI * 0.95, -Math.PI * 0.05);

    const speed = rand(140, 300);

    return { x: target.x, y: target.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, rot: rand(0, 6), spin: rand(-12, 12), shape: rockShape(rand(2.5, 4.5)) };
  });

  const ground = target.y + 22;

  let k = 0;

  const hideBlast = show(stage, (g) => {
    const e = easeOutCubic(Math.min(1, k * 1.6));

    g.globalCompositeOperation = "lighter";
    g.globalAlpha = Math.max(0, 1 - k * 1.6);
    g.strokeStyle = palette.accent;
    g.lineWidth = 5 * (1 - k) + 1;
    g.beginPath();
    g.ellipse(target.x, ground, 14 + e * 90, (14 + e * 90) * 0.3, 0, 0, Math.PI * 2);
    g.stroke();
    g.globalAlpha = Math.max(0, 1 - k * 1.2) * 0.8;
    g.strokeStyle = "#ffffff";
    g.lineWidth = 2;
    g.beginPath();
    g.ellipse(target.x, ground, 10 + e * 60, (10 + e * 60) * 0.3, 0, 0, Math.PI * 2);
    g.stroke();

    g.globalCompositeOperation = "source-over";
    g.globalAlpha = Math.max(0, 1 - k);

    for (const r of rocks) {
      g.save();
      g.translate(r.x, r.y);
      g.rotate(r.rot);
      polyPath(g, r.shape);
      g.fillStyle = "#2a1a10";
      g.fill();
      g.strokeStyle = "#ff9a3a";
      g.lineWidth = 1;
      g.stroke();
      g.restore();
    }

    g.globalAlpha = 1;
  });

  burst(stage, target, palette.tints, spec.critical ? 60 : 40, { speed: [60, 320], life: [0.35, 0.8], gravity: 80 });
  for (let n = 0; n < 12; n++) emit(stage, { x: target.x, y: ground }, { tints: SMOKE, speed: [20, 90], angle: [-Math.PI, 0], life: [0.6, 1.1], scale: [0.6, 1.6], drag: 2, additive: false, alpha: 0.55, gravity: -25 });

  await Promise.all([
    impactSplash(stage, target, palette, { flash: spec.critical ? 190 : 150, flashMs: 420, sheetScale: spec.critical ? 2.8 : 2.3 }),
    tween(stage, AFTER_MS, (v, dt) => {
      k = v;
      stepBodies(rocks, dt, 900);
    }),
  ]);
  hideBlast();
}

export const meteor: FxAnimation = (run) => perTarget(run.stage, run.to, ARCHETYPE_FX.meteor.staggerMs, (target) => strike(run, target));
