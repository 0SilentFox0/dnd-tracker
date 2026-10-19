import { halfSize } from "../runtime/anchors";
import { lightBeam } from "../runtime/beam";
import { clamp01, easeOutCubic, envelope } from "../runtime/easing";
import { chance, rand } from "../runtime/geometry";
import { emit, flash, ring } from "../runtime/primitives";
import { burst } from "../runtime/recipes";
import { animateEl, schedule, show, tween } from "../runtime/stage";
import { streakBurst } from "../runtime/streaks";
import { glow, sprite } from "../runtime/texture";
import type { FxAnimation } from "./types";

import { ARCHETYPE_FX } from "@/lib/utils/battle/fx";

const CRASH_MS = ARCHETYPE_FX.holyword.impactMs;

const TOTAL_MS = 2700;

const STAGGER_MS = 160;

const GOLD = ["#ffffff", "#fff6d8", "#ffe39a", "#ffc94a"];

const SMOKE = ["#2a2018", "#3a2c20", "#1c1610"];

const EMBERS = ["#fff1b8", "#ffcf6a", "#ff9a3a"];

const SHAKE: Keyframe[] = [
  { transform: "none", filter: "none" },
  { transform: "translate(-4px,3px)", filter: "brightness(2.2) sepia(.6)", offset: 0.1 },
  { transform: "translate(4px,-2px)", offset: 0.25 },
  { transform: "translate(-3px,1px)", offset: 0.4 },
  { transform: "translate(2px,0)", filter: "brightness(1.4) sepia(.3)", offset: 0.6 },
  { transform: "none", filter: "none" },
];

export const holyword: FxAnimation = async ({ stage, from, to, targetEls }) => {
  if (!to.length) return;

  const sizes = to.map((_, i) => halfSize(targetEls[i]));

  const left = Math.min(...to.map((p, i) => p.x - sizes[i].w));

  const right = Math.max(...to.map((p, i) => p.x + sizes[i].w));

  const cx = (left + right) / 2;

  const cy = to.reduce((s, p) => s + p.y, 0) / to.length;

  const sky = Math.max(10, Math.min(...to.map((p) => p.y)) - 170);

  const sun = glow("#fff1b8");

  const rays = stage.g.createLinearGradient(0, sky, 0, cy + 50);

  rays.addColorStop(0, "rgba(255,241,184,0.4)");
  rays.addColorStop(1, "rgba(255,241,184,0)");

  const white = glow("#ffffff");

  let t = 0;

  const hide = show(stage, (g) => {
    // The Word: bell-like rings booming out of the caster.
    for (let r = 0; r < 3; r++) {
      const k = (t - r * 130) / 650;

      if (k <= 0 || k >= 1) continue;

      g.globalCompositeOperation = "lighter";
      g.globalAlpha = (1 - k) * 0.9;
      g.strokeStyle = r ? "#ffe39a" : "#ffffff";
      g.lineWidth = 4 * (1 - k) + 1;
      g.beginPath();
      g.ellipse(from.x, from.y, 12 + easeOutCubic(k) * 70, (12 + easeOutCubic(k) * 70) * 0.6, 0, 0, Math.PI * 2);
      g.stroke();
    }

    sprite(g, white, from.x, from.y, 2.4, undefined, envelope(clamp01(t / 500), 0.2, 0.6));

    // The sky splits open over the enemies, rays fanning down out of the rift.
    const open = easeOutCubic(clamp01((t - 280) / 420)) * (1 - clamp01((t - 1900) / 600));

    if (open > 0) {
      const span = (right - left) / 2 + 50;

      sprite(g, sun, cx, sky, ((span * 2.4) / 64) * open, (46 / 64) * open, open);
      sprite(g, white, cx, sky, ((span * 1.5) / 64) * open, (12 / 64) * open, open);

      g.globalCompositeOperation = "lighter";
      g.globalAlpha = open;
      g.fillStyle = rays;

      for (let r = 0; r < 7; r++) {
        const x = cx + (r / 6 - 0.5) * span * 1.6;

        const spread = 8 + (r % 3) * 7;

        const sway = Math.sin(t / 500 + r * 1.7) * 5;

        g.beginPath();
        g.moveTo(x - 3, sky);
        g.lineTo(x + 3, sky);
        g.lineTo(x + (x - cx) * 0.4 + spread + sway, cy + 50);
        g.lineTo(x + (x - cx) * 0.4 - spread + sway, cy + 50);
        g.closePath();
        g.fill();
      }
    }

    // Columns crash down on every enemy.
    to.forEach((p, i) => {
      const at = CRASH_MS - 90 + i * STAGGER_MS;

      const k = t - at;

      if (k <= 0) return;

      const drop = clamp01(k / 90);

      const alpha = Math.min(1, 0.4 + drop) * (1 - clamp01((t - 1500) / 500));

      const width = sizes[i].w * (0.5 + 0.25 * Math.max(0, 1 - (k - 90) / 250));

      lightBeam(g, p.x, sky, sky + (p.y + sizes[i].h - sky) * drop, width, alpha, "255,232,150", 0.15);
    });

    // The radiant shockwave rolling out through the whole enemy line.
    const wave = (t - CRASH_MS - 60) / 800;

    if (wave > 0 && wave < 1) {
      const e = easeOutCubic(wave);

      g.globalCompositeOperation = "lighter";

      for (const [rgb, width, scale] of [["255,215,110", 18, 1], ["255,255,255", 4, 0.94]] as const) {
        g.globalAlpha = (1 - wave) * 0.85;
        g.strokeStyle = `rgb(${rgb})`;
        g.lineWidth = width * (1 - wave) + 1;
        g.beginPath();
        g.ellipse(cx, cy + 10, (30 + e * ((right - left) / 2 + 70)) * scale, (12 + e * 80) * scale, 0, 0, Math.PI * 2);
        g.stroke();
      }
    }

    g.globalAlpha = 1;
  });

  to.forEach((p, i) => {
    const at = CRASH_MS + i * STAGGER_MS;

    schedule(stage, at, () => {
      const feet = { x: p.x, y: p.y + sizes[i].h };

      void flash(stage, p, "#fff6d8", 120, 400);
      void ring(stage, feet, "#ffe39a", 600, sizes[i].w * 1.1, 4, 0.3);
      burst(stage, p, GOLD, 28, { speed: [80, 360], gravity: 120, scale: [0.55, 0.05] });
      void streakBurst(stage, feet, { colors: GOLD, count: 16, angle: -Math.PI / 2, cone: 1.2, speed: [160, 340], life: [0.25, 0.55], gravity: 380 });

      if (targetEls[i]) void animateEl(stage, targetEls[i], SHAKE, { duration: 650, easing: "ease-out" });
    });
  });

  const run = tween(stage, TOTAL_MS, (k, dt) => {
    t = k * TOTAL_MS;

    // The dark ones smoulder: black smoke and embers rising off them after the strike.
    if (t > CRASH_MS + 100 && t < 2300) {
      to.forEach((p, i) => {
        const { w, h } = sizes[i];

        if (t > 1350 && chance(0.5, dt)) emit(stage, { x: p.x + rand(-w * 0.7, w * 0.7), y: p.y + rand(-h * 0.3, h * 0.6) }, { tints: SMOKE, speed: [15, 40], angle: [-Math.PI * 0.6, -Math.PI * 0.4], life: [0.7, 1.2], scale: [0.4, 1.1], additive: false, alpha: 0.4, gravity: -30 });

        if (chance(0.6, dt)) emit(stage, { x: p.x + rand(-w * 0.8, w * 0.8), y: p.y + rand(-h * 0.5, h * 0.6) }, { tints: EMBERS, speed: [20, 60], angle: [-Math.PI * 0.7, -Math.PI * 0.3], life: [0.5, 0.9], scale: [0.18, 0.04], gravity: -50 });
      });
    }
  }).then(hide);

  await run;
};
