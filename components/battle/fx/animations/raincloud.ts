import { faceOf, halfSize } from "../runtime/anchors";
import { sinkingBadge } from "../runtime/badge";
import { clamp01, easeOutCubic, envelope } from "../runtime/easing";
import { chance, type FxPoint, perTick, prune, rand } from "../runtime/geometry";
import { emit } from "../runtime/primitives";
import { perTarget } from "../runtime/recipes";
import { cloudPath } from "../runtime/shapes";
import { animateEl, timeline } from "../runtime/stage";
import { glow, sprite, spritePx } from "../runtime/texture";
import type { FxAnimation } from "./types";

import { ARCHETYPE_FX } from "@/lib/utils/battle/fx";

const RAIN_MS = ARCHETYPE_FX.raincloud.impactMs;

const TOTAL_MS = 2700;

const STOP_MS = 2150;

const WISPS = ["#6a7280", "#58606c", "#7c8492"];

const MIST = ["#8a9aae", "#a4b2c4", "#74849a"];

const BADGE = { top: "#3c4656", bottom: "#161c26", rim: "#8aa0bc", ink: "#d8e2ee" };

interface Drop extends FxPoint {
  vy: number;
  len: number;
}

export const raincloud: FxAnimation = ({ stage, to, targetEls }) =>
  perTarget(stage, to, 0, async (target, i) => {
    const el = targetEls[i];

    const { w, h } = halfSize(el);

    const face = faceOf(el, target);

    const size = Math.max(40, Math.min(66, w * 0.65));

    const cloud = { x: target.x + (face.x - target.x) * 0.35, y: Math.max(size * 0.46, target.y - h - size * 0.2) };

    const floor = target.y + h;

    const drops: Drop[] = [];

    const ember = glow("#ff9a3a");

    const gloom = glow("#4a5668");

    const shade = stage.g.createLinearGradient(0, -size * 0.3, 0, size * 0.25);

    shade.addColorStop(0, "#8a92a0");
    shade.addColorStop(0.55, "#4a525e");
    shade.addColorStop(1, "#262c36");

    const run = timeline(
      stage,
      TOTAL_MS,
      (g, t) => {
        const form = easeOutCubic(clamp01((t - 150) / (RAIN_MS - 150)));

        const fade = 1 - clamp01((t - STOP_MS) / 450);

        const bob = Math.sin(t / 380) * 2;

        // Cold mist pooling round the foe's feet.
        const pool = envelope(clamp01((t - RAIN_MS) / (TOTAL_MS - RAIN_MS)), 0.3, 0.3);

        spritePx(g, glow("#6a7a90"), target.x, floor - 4, w * 2.4, h * 1.1, pool * 0.45, false);

        // The light in its eyes gutters out under the drizzle.
        const spark = 1 - clamp01((t - RAIN_MS - 200) / 900);

        if (spark > 0) sprite(g, ember, face.x, face.y - face.r * 0.15, (face.r * 1.4) / 32, undefined, spark * 0.85 * clamp01(t / 200));

        g.globalCompositeOperation = "source-over";
        g.lineCap = "round";
        g.strokeStyle = "#d8e4f4";
        g.lineWidth = 1.4;

        for (const d of drops) {
          g.globalAlpha = 0.9 * fade;
          g.beginPath();
          g.moveTo(d.x + d.len * 0.18, d.y - d.len);
          g.lineTo(d.x, d.y);
          g.stroke();
        }

        if (form > 0) {
          const cw = size * (0.55 + 0.45 * form);

          sprite(g, gloom, cloud.x, cloud.y, (cw * 1.9) / 64, (cw * 1.1) / 64, form * fade * 0.6, false);
          g.save();
          g.translate(cloud.x, cloud.y + bob);
          g.globalAlpha = form * fade;
          g.globalCompositeOperation = "source-over";
          cloudPath(g, 0, -1.5, cw);
          g.fillStyle = "#a8b2c0";
          g.fill();
          cloudPath(g, 0, 0, cw);
          g.fillStyle = shade;
          g.fill();
          g.restore();
        }

        sinkingBadge(g, target.x + (target.x - face.x) * 0.75, target.y - h - 10, clamp01((t - 1100) / 1400), "−2 мораль", BADGE);
        g.globalAlpha = 1;
      },
      (t, dt) => {
        // Grey wisps drift in and gather into the little cloud.
        if (t < RAIN_MS - 100) {
          perTick(1, dt, () => {
            const a = rand(0, Math.PI * 2);

            const d = rand(50, 90);

            emit(stage, { x: cloud.x + Math.cos(a) * d, y: cloud.y + Math.sin(a) * d * 0.5 }, { tints: WISPS, speed: [70, 110], angle: [a + Math.PI - 0.15, a + Math.PI + 0.15], life: [0.45, 0.6], scale: [0.6, 0.2], additive: false, alpha: 0.5, drag: 1.5 });
          });
        }

        if (t > RAIN_MS && t < STOP_MS) {
          const width = size * 0.75;

          for (let n = 0; n < 3; n++) if (chance(0.8, dt)) drops.push({ x: cloud.x + rand(-width / 2, width / 2), y: cloud.y + size * 0.15, vy: rand(260, 340), len: rand(8, 13) });
        }

        for (const d of drops) {
          d.y += d.vy * dt;
          d.x -= d.vy * dt * 0.18;
        }

        for (const d of drops) {
          if (d.y < floor - rand(0, h * 1.6)) continue;

          d.vy = 0;

          if (chance(0.3, dt)) emit(stage, d, { tints: MIST, speed: [10, 30], angle: [-Math.PI * 0.9, -Math.PI * 0.1], life: [0.2, 0.35], scale: [0.12, 0.03], gravity: 200 });
        }

        prune(drops, (d) => d.vy > 0);

        if (t > RAIN_MS + 300 && t < STOP_MS && chance(0.35, dt)) emit(stage, { x: target.x + rand(-w, w), y: floor - rand(0, 8) }, { tints: MIST, speed: [4, 14], angle: [-Math.PI * 0.6, -Math.PI * 0.4], life: [1, 1.5], scale: [0.5, 1.1], additive: false, alpha: 0.22 });
      },
    );

    const gloomOver = animateEl(stage, el, [{ filter: "none", transform: "none" }, { filter: "saturate(.3) brightness(.78) sepia(.25) hue-rotate(175deg)", transform: "translateY(3px)", offset: 0.3 }, { filter: "saturate(.3) brightness(.78) sepia(.25) hue-rotate(175deg)", transform: "translateY(3px)", offset: 0.8 }, { filter: "none", transform: "none" }], { duration: TOTAL_MS - RAIN_MS, delay: RAIN_MS, easing: "ease-in-out" });


    await Promise.all([run, gloomOver]);
  });
