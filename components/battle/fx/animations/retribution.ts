import { halfSize } from "../runtime/anchors";
import { lightBeam } from "../runtime/beam";
import { clamp01, easeOutCubic } from "../runtime/easing";
import { chance, farSide, type FxPoint, rand } from "../runtime/geometry";
import { emit, flash, ring } from "../runtime/primitives";
import { burst } from "../runtime/recipes";
import { animateEl, schedule, show, tween } from "../runtime/stage";
import { streakBurst } from "../runtime/streaks";
import { glow, sprite } from "../runtime/texture";
import type { FxAnimation } from "./types";

import { IMPACT_MS } from "@/lib/utils/battle/fx";

const SMITE_MS = IMPACT_MS.retribution;

const FORM_AT = 320;

const WIND_AT = 560;

const TOTAL_MS = 2500;

const HEAD_W = 42;

const HEAD_H = 24;

const HANDLE = 46;

const FLAME = ["#ffffff", "#fff6d8", "#ffe9a0"];

const GOLD = ["#ffffff", "#fff1b8", "#ffd86b", "#ffb72a"];

const SLAM: Keyframe[] = [
  { transform: "none", filter: "none" },
  { transform: "translateY(7px) scaleY(0.92)", filter: "brightness(2.4) sepia(.5)", offset: 0.12 },
  { transform: "translate(-3px,-2px)", offset: 0.35 },
  { transform: "translate(2px,1px)", filter: "brightness(1.3)", offset: 0.6 },
  { transform: "none", filter: "none" },
];

// A war hammer of light; the origin is the end of the handle, the head hangs below it.
function hammer(g: CanvasRenderingContext2D, alpha: number, heat: number) {
  g.globalAlpha = alpha;
  g.globalCompositeOperation = "source-over";
  g.shadowColor = "#ffd86b";
  g.shadowBlur = 14 + heat * 16;
  g.fillStyle = "#e8c060";
  g.fillRect(-3, 0, 6, HANDLE);

  const y = HANDLE;

  const grad = g.createLinearGradient(0, y, 0, y + HEAD_H);

  grad.addColorStop(0, "#fffbe8");
  grad.addColorStop(0.45, "#ffe39a");
  grad.addColorStop(1, "#c8901e");
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(-HEAD_W / 2 + 4, y);
  g.lineTo(HEAD_W / 2 - 4, y);
  g.lineTo(HEAD_W / 2, y + 4);
  g.lineTo(HEAD_W / 2, y + HEAD_H - 4);
  g.lineTo(HEAD_W / 2 - 4, y + HEAD_H);
  g.lineTo(-HEAD_W / 2 + 4, y + HEAD_H);
  g.lineTo(-HEAD_W / 2, y + HEAD_H - 4);
  g.lineTo(-HEAD_W / 2, y + 4);
  g.closePath();
  g.fill();
  g.shadowBlur = 0;
  g.strokeStyle = "#fff8e0";
  g.lineWidth = 1.4;
  g.stroke();
  g.strokeStyle = "rgba(160,110,20,0.8)";
  g.beginPath();
  g.moveTo(-HEAD_W / 2 + 6, y + HEAD_H / 2);
  g.lineTo(HEAD_W / 2 - 6, y + HEAD_H / 2);
  g.stroke();

  if (heat > 0) {
    g.globalCompositeOperation = "lighter";
    g.globalAlpha = alpha * heat * 0.6;
    g.fillStyle = "#ffffff";
    g.fillRect(-HEAD_W / 2, y, HEAD_W, HEAD_H);
  }
}

// Gold cracks splitting out from where the hammer lands, flattened onto the row.
function cracks(): FxPoint[][] {
  return Array.from({ length: 8 }, (_, n) => {
    let a = (n / 8) * Math.PI * 2 + rand(-0.25, 0.25);

    let x = 0;

    let y = 0;

    return Array.from({ length: 5 }, () => {
      a += rand(-0.45, 0.45);
      x += Math.cos(a) * rand(9, 15);
      y += Math.sin(a) * rand(4, 7);

      return { x, y };
    });
  });
}

export const retribution: FxAnimation = async ({ stage, from, to, targetEls }) => {
  const target = to[0];

  if (!target) return;

  const el = targetEls[0];

  const { w, h } = halfSize(el);

  // The hammer swings in from the caster's side, where the field has room, pivoting on its handle end.
  const side = -farSide(target, from, stage.layer.clientWidth);

  const pivot = { x: target.x + side * w * 0.55, y: target.y + 12 };

  const raised = -Math.PI / 2 + side * 0.75;

  const drawn = -Math.PI / 2 + side * 1.05;

  const struck = -Math.PI / 2 - side * (Math.PI / 2 - 0.3);

  const reach = HANDLE + HEAD_H / 2;

  const strike = { x: pivot.x + Math.cos(struck) * reach, y: pivot.y + Math.sin(struck) * reach };

  const formAt = { x: pivot.x + Math.cos(raised) * reach, y: pivot.y + Math.sin(raised) * reach };

  const lines = cracks();

  const sky = Math.max(-30, target.y - 260);

  const halo = glow("#ffd86b");

  let t = 0;

  const hide = show(stage, (g) => {
    // The hammer: forms out of sparks, draws back and comes down.
    const form = clamp01((t - FORM_AT) / 260);

    const wind = easeOutCubic(clamp01((t - WIND_AT) / (SMITE_MS - WIND_AT - 150)));

    const fall = clamp01((t - SMITE_MS + 150) / 150) ** 2;

    const after = clamp01((t - SMITE_MS - 150) / 600);

    if (form > 0 && after < 1) {
      const angle = fall > 0 ? drawn + (struck - drawn) * fall : raised + (drawn - raised) * wind;

      const head = { x: pivot.x + Math.cos(angle) * reach, y: pivot.y + Math.sin(angle) * reach };

      sprite(g, halo, head.x, head.y, 1.8, 1.4, form * (1 - after) * 0.7);

      // A smear of light behind the falling head.
      if (fall > 0 && fall < 1) {
        g.globalCompositeOperation = "lighter";

        for (const [color, width, alpha] of [["#ffd86b", HEAD_H, 0.45], ["#ffffff", 4, 0.8]] as const) {
          g.globalAlpha = alpha;
          g.strokeStyle = color;
          g.lineWidth = width;
          g.beginPath();
          g.arc(pivot.x, pivot.y, reach, side > 0 ? angle : drawn, side > 0 ? drawn : angle);
          g.stroke();
        }
      }

      g.save();
      g.translate(pivot.x, pivot.y);
      g.rotate(angle - Math.PI / 2);
      g.scale(0.7 + form * 0.3, 0.7 + form * 0.3);
      hammer(g, form * (1 - after), fall);
      g.restore();
    }

    // A shaft of blinding light comes down with the blow.
    const shaft = clamp01((t - SMITE_MS + 120) / 120) * (1 - clamp01((t - SMITE_MS - 250) / 650));

    if (shaft > 0) lightBeam(g, strike.x, sky, target.y + h, w * 0.4, shaft * 0.7, "255,240,190", 0.3);

    const glowing = clamp01((t - SMITE_MS) / 80) * (1 - clamp01((t - SMITE_MS - 400) / 1000));

    if (glowing > 0) {
      g.globalCompositeOperation = "lighter";
      g.lineCap = "round";
      g.lineJoin = "round";

      for (const [color, width] of [["rgba(255,200,90,0.6)", 4], ["#fffbe8", 1.4]] as const) {
        g.globalAlpha = glowing;
        g.strokeStyle = color;
        g.lineWidth = width;

        for (const line of lines) {
          g.beginPath();
          g.moveTo(strike.x, strike.y);

          for (const p of line) g.lineTo(strike.x + p.x, strike.y + p.y);

          g.stroke();
        }
      }
    }

    g.globalAlpha = 1;
  });

  // The caster's own blood flares with white flame, the price of the vengeance.
  for (let n = 0; n < 30; n++) {
    schedule(stage, n * 14, () => emit(stage, { x: from.x + rand(-70, 70), y: from.y + rand(14, 28) }, { tints: FLAME, speed: [60, 140], angle: [-Math.PI * 0.58, -Math.PI * 0.42], life: [0.35, 0.65], scale: [0.6, 0.08], gravity: -120, drag: 1.5 }));
  }

  schedule(stage, 60, () => void flash(stage, from, "#fff6d8", 90, 380));

  schedule(stage, FORM_AT - 40, () => {
    for (let n = 0; n < 24; n++) {
      const a = rand(0, Math.PI * 2);

      const d = rand(50, 90);

      emit(stage, { x: formAt.x + Math.cos(a) * d, y: formAt.y + Math.sin(a) * d * 0.6 }, { tints: GOLD, speed: [d * 2.4, d * 2.8], angle: [a + Math.PI - 0.05, a + Math.PI + 0.05], life: [0.32, 0.4], scale: [0.3, 0.05], drag: 3 });
    }
  });

  schedule(stage, SMITE_MS, () => {
    const feet = { x: target.x, y: target.y + h };

    void flash(stage, strike, "#fff6d8", 80, 320);
    void ring(stage, feet, "#ffe39a", 700, w * 1.2, 5, 0.3);
    void ring(stage, feet, "#ffffff", 500, w * 0.8, 2, 0.3);
    burst(stage, strike, GOLD, 50, { speed: [100, 380], gravity: 260, scale: [0.5, 0.05] });
    void streakBurst(stage, strike, { colors: GOLD, count: 22, angle: -Math.PI / 2, cone: 1.4, speed: [180, 380], life: [0.3, 0.6], gravity: 500 });

    if (el) void animateEl(stage, el, SLAM, { duration: 600, easing: "ease-out" });
  });

  await tween(stage, TOTAL_MS, (k, dt) => {
    t = k * TOTAL_MS;

    if (t > SMITE_MS && t < TOTAL_MS - 500 && chance(0.5, dt)) emit(stage, { x: target.x + rand(-w * 0.8, w * 0.8), y: target.y + rand(-h * 0.4, h * 0.6) }, { tints: GOLD, speed: [15, 50], angle: [-Math.PI * 0.7, -Math.PI * 0.3], life: [0.5, 0.9], scale: [0.2, 0.04], gravity: -40 });
  }).then(hide);
};
