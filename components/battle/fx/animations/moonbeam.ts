import { halfSize } from "../runtime/anchors";
import { lightBeam } from "../runtime/beam";
import { clamp01, easeOutCubic, envelope } from "../runtime/easing";
import { rand } from "../runtime/geometry";
import { emit, flash, ring } from "../runtime/primitives";
import { perTarget } from "../runtime/recipes";
import { crescent } from "../runtime/shapes";
import { animateEl, schedule, show, tween } from "../runtime/stage";
import { streakBurst } from "../runtime/streaks";
import { glow, spritePx } from "../runtime/texture";
import type { FxAnimation } from "./types";

import { IMPACT_MS } from "@/lib/utils/battle/fx";

const MOON_MS = 420;

const STRIKE_MS = IMPACT_MS.moonbeam;

const TOTAL_MS = 2500;

const SILVER = ["#ffffff", "#e6eeff", "#c8d8f5"];

const PIN: Keyframe[] = [
  { transform: "none", filter: "none" },
  { transform: "translateY(4px) scale(1.01,0.95)", filter: "brightness(1.6) saturate(.4)", offset: 0.1 },
  { transform: "translateY(3px)", filter: "brightness(1.25) saturate(.7)", offset: 0.5 },
  { transform: "none", filter: "none" },
];

export const moonbeam: FxAnimation = ({ stage, from, to, targetEls }) =>
  perTarget(stage, to, 0, async (target, i) => {
    const el = targetEls[i];

    const { w, h } = halfSize(el);

    const ground = target.y + h;

    const moon = { x: target.x, y: Math.max(14, target.y - h - 34) };

    const R = Math.max(9, Math.min(15, h * 0.45));

    let t = 0;

    const hide = show(stage, (g) => {
      // A pale moon in broad daylight over the foe.
      const shown = envelope(clamp01(t / (TOTAL_MS - 200)), 0.2, 0.3);

      if (shown > 0) {
        spritePx(g, glow("#c8d8f5"), moon.x, moon.y, R * 6, undefined, 0.6 * shown);
        g.save();
        g.globalCompositeOperation = "source-over";
        g.globalAlpha = shown;
        g.translate(moon.x, moon.y);
        g.rotate(-0.35);
        g.fillStyle = "#f4f7ff";
        g.strokeStyle = "rgba(120,140,190,0.9)";
        g.lineWidth = 0.8;
        g.shadowColor = "#cfe0ff";
        g.shadowBlur = 8;
        crescent(g, 0, 0, R);
        g.restore();
      }

      // The silver pillar drops from it and pins the foe to the ground.
      const fall = easeOutCubic(clamp01((t - MOON_MS) / (STRIKE_MS - MOON_MS)));

      const beam = fall * (1 - clamp01((t - STRIKE_MS - 400) / 900));

      if (beam > 0) {
        const bottom = moon.y + (ground + 6 - moon.y) * fall;

        const slam = 1 + 0.6 * Math.max(0, 1 - Math.abs(t - STRIKE_MS) / 140);

        lightBeam(g, target.x, moon.y, bottom, Math.max(12, w * 0.3) * slam, beam * 0.9, "205,222,255", 0.12);
        lightBeam(g, target.x, moon.y, bottom, Math.max(5, w * 0.1), beam, "255,255,255", 0.12);
      }

      // Afterwards the foe keeps shining like a mark: a cold outline and brackets closing in.
      const mark = clamp01((t - STRIKE_MS - 250) / 350) * (1 - clamp01((t - TOTAL_MS + 400) / 400));

      if (mark > 0) {
        const pulse = 0.75 + Math.sin(t / 130) * 0.25;

        const gap = 10 * (1 - easeOutCubic(clamp01((t - STRIKE_MS - 250) / 500)));

        const bx = w + 4 + gap;

        const by = h + 4 + gap;

        g.globalCompositeOperation = "lighter";
        g.globalAlpha = mark * pulse;
        g.strokeStyle = "rgba(205,222,255,0.55)";
        g.lineWidth = 4;
        g.beginPath();
        g.roundRect(target.x - w - 1, target.y - h - 1, w * 2 + 2, h * 2 + 2, 8);
        g.stroke();
        g.strokeStyle = "#f4f7ff";
        g.lineWidth = 1.6;
        g.stroke();
        g.lineWidth = 2;

        for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
          const cx = target.x + sx * bx;

          const cy = target.y + sy * by;

          g.beginPath();
          g.moveTo(cx - sx * 9, cy);
          g.lineTo(cx, cy);
          g.lineTo(cx, cy - sy * 9);
          g.stroke();
        }
      }

      g.globalAlpha = 1;
    });

    // A faint silver thread from the caster calls the moon down.
    schedule(stage, 60, () => void flash(stage, from, "#e6eeff", 40, 400));

    schedule(stage, STRIKE_MS, () => {
      void flash(stage, target, "#ffffff", Math.max(90, w * 1.4), 380);
      void ring(stage, { x: target.x, y: ground }, "#e6eeff", 650, w * 0.9, 3, 0.25);
      void ring(stage, { x: target.x, y: ground }, "#c8d8f5", 900, w * 1.3, 2, 0.25);
      void streakBurst(stage, { x: target.x, y: ground }, { colors: SILVER, count: 18, angle: -Math.PI / 2, cone: 1.2, speed: [90, 220], gravity: 160, life: [0.3, 0.6] });

      if (el) void animateEl(stage, el, PIN, { duration: 1100, easing: "ease-out" });
    });

    await tween(stage, TOTAL_MS, (k) => {
      t = k * TOTAL_MS;

      if (t > STRIKE_MS && t < TOTAL_MS - 500 && Math.random() < 0.45) emit(stage, { x: target.x + rand(-w, w), y: target.y + rand(-h, h) }, { tints: SILVER, speed: [6, 18], angle: [-Math.PI * 0.7, -Math.PI * 0.3], life: [0.6, 1], scale: [0.16, 0.03], gravity: -15 });
    }).then(() => void hide());
  });
