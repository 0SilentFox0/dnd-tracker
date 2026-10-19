import { halfSize } from "../runtime/anchors";
import { type BadgeLook, shieldBadge } from "../runtime/badge";
import { clamp01, easeOutCubic, envelope } from "../runtime/easing";
import { rand } from "../runtime/geometry";
import { emit, flash, ring } from "../runtime/primitives";
import { perTarget } from "../runtime/recipes";
import { sword } from "../runtime/shapes";
import { animateEl, schedule, show, tween, wait } from "../runtime/stage";
import { streakBurst } from "../runtime/streaks";
import { glow, sprite } from "../runtime/texture";
import type { FxAnimation } from "./types";

import { ARCHETYPE_FX } from "@/lib/utils/battle/fx";

const FLARE_MS = ARCHETYPE_FX.might.impactMs;

const SWING_MS = 360;

const TOTAL_MS = 2600;

const GOLD = ["#ffffff", "#fff1b8", "#ffd86b", "#ffb72a"];

const GOLD_BADGE: BadgeLook = { top: "#fff0b0", bottom: "#c8901e", rim: "#fff8e0", ink: "#3a2408" };

const GROW: Keyframe[] = [{ transform: "none" }, { transform: "scale(1.07)", offset: 0.3 }, { transform: "scale(1.04)", offset: 0.7 }, { transform: "none" }];

// One wing of light: long feathers fanning up and out from the hero's shoulder.
function wing(g: CanvasRenderingContext2D, x: number, y: number, side: number, open: number, alpha: number) {
  g.globalCompositeOperation = "lighter";

  for (let f = 0; f < 6; f++) {
    const a = -Math.PI / 2 + side * (0.35 + f * 0.22) * open;

    const len = (62 - f * 6) * (0.4 + open * 0.6);

    g.save();
    g.translate(x, y);
    g.rotate(a);
    g.globalAlpha = alpha * (0.55 - f * 0.05);
    g.fillStyle = "#ffe9a0";
    g.beginPath();
    g.ellipse(len / 2, 0, len / 2, 4.5 - f * 0.3, 0, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = alpha * 0.8;
    g.strokeStyle = "#fffbe8";
    g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(4, 0);
    g.lineTo(len - 2, 0);
    g.stroke();
    g.restore();
  }
}

export const might: FxAnimation = ({ stage, to, targetEls }) =>
  perTarget(stage, to, 0, async (target, i) => {
    const el = targetEls[i];

    const { w, h } = halfSize(el);

    const sig = { x: target.x, y: Math.max(40, target.y - h - 26) };

    const len = 72;

    const halo = glow("#ffd86b");

    const hot = glow("#ffffff");

    let t = 0;

    const hide = show(stage, (g) => {
      const open = easeOutCubic(clamp01((t - 250) / 700));

      const wingsAlpha = envelope(clamp01((t - 250) / 1900), 0.2, 0.35);

      wing(g, target.x - w * 0.35, target.y - 4, -1, open, wingsAlpha);
      wing(g, target.x + w * 0.35, target.y - 4, 1, open, wingsAlpha);

      // The sword sigil: a downturned blade inside a ring of rays, flaring at FLARE_MS.
      const appear = easeOutCubic(clamp01((t - 200) / 450));

      const gone = clamp01((t - FLARE_MS - SWING_MS) / 300);

      const flare = Math.max(0, 1 - Math.abs(t - FLARE_MS) / 220);

      if (appear > 0 && gone < 1) {
        const a = appear * (1 - gone);

        sprite(g, halo, sig.x, sig.y, (1.3 + flare * 1.3) * appear, undefined, a * (0.45 + flare * 0.4));

        g.save();
        g.translate(sig.x, sig.y);
        g.globalCompositeOperation = "lighter";
        g.globalAlpha = a * 0.85;
        g.strokeStyle = "#ffe39a";
        g.lineWidth = 1.6;
        g.beginPath();
        g.arc(0, 0, 30 * appear, 0, Math.PI * 2);
        g.stroke();

        for (let r = 0; r < 12; r++) {
          const ang = (r / 12) * Math.PI * 2 + t / 900;

          const out = 35 + (r % 2) * 7 + flare * 16;

          g.beginPath();
          g.moveTo(Math.cos(ang) * 33, Math.sin(ang) * 33);
          g.lineTo(Math.cos(ang) * out, Math.sin(ang) * out);
          g.stroke();
        }

        g.globalCompositeOperation = "source-over";
        g.globalAlpha = a;
        g.rotate(Math.PI / 2);
        g.translate(-len / 2, 0);
        g.shadowColor = "#ffd86b";
        g.shadowBlur = 10 + flare * 14;

        const blade = g.createLinearGradient(0, -4, 0, 4);

        blade.addColorStop(0, "#fffbe8");
        blade.addColorStop(0.5, "#ffe39a");
        blade.addColorStop(1, "#d8a030");
        sword(g, len, blade, "#c8901e");
        g.shadowBlur = 0;
        g.strokeStyle = "#fff8e0";
        g.lineWidth = 1;
        g.stroke();
        g.restore();
        sprite(g, hot, sig.x, sig.y + len * 0.3, flare * 1.4, undefined, flare);
      }

      // The radiant swing: a crescent cut sweeping down and across the hero, thick at its head.
      const s = clamp01((t - FLARE_MS) / SWING_MS);

      const tail = clamp01((t - FLARE_MS - SWING_MS) / 300);

      if (s > 0 && tail < 1) {
        const c = { x: target.x, y: target.y - h * 0.5 };

        const a0 = Math.PI * 0.92;

        const head = a0 - easeOutCubic(s) * Math.PI * 0.84;

        const span = Math.min(a0 - head, 1.6);

        g.globalCompositeOperation = "lighter";
        g.lineCap = "butt";

        for (let n = 0; n < 10; n++) {
          const from = head + (span * n) / 10;

          const to = head + (span * (n + 1)) / 10;

          const thin = 1 - n / 10;

          g.globalAlpha = (1 - tail) * thin;
          g.strokeStyle = "#ffcf4a";
          g.lineWidth = 3 + 14 * thin;
          g.beginPath();
          g.ellipse(c.x, c.y, w * 0.95, h * 1.4, 0, from, to);
          g.stroke();
          g.strokeStyle = "#ffffff";
          g.lineWidth = 1 + 4 * thin;
          g.beginPath();
          g.ellipse(c.x, c.y, w * 0.95, h * 1.4, 0, from, to);
          g.stroke();
        }
      }

      g.globalAlpha = 1;

      const b = clamp01((t - FLARE_MS - 450) / 1250);

      if (b > 0 && b < 1) shieldBadge(g, target.x, target.y - h - 8 - easeOutCubic(b) * 26, envelope(b, 0.12, 0.3), "+атака", GOLD_BADGE);
    });

    for (let n = 0; n < 26; n++) {
      schedule(stage, n * 9, () => {
        const a = rand(0, Math.PI * 2);

        const d = rand(60, 110);

        emit(stage, { x: sig.x + Math.cos(a) * d, y: sig.y + Math.sin(a) * d * 0.6 }, { tints: GOLD, speed: [d * 2.2, d * 2.6], angle: [a + Math.PI - 0.05, a + Math.PI + 0.05], life: [0.35, 0.45], scale: [0.3, 0.05], drag: 3 });
      });
    }

    schedule(stage, FLARE_MS, () => {
      void flash(stage, sig, "#fff1b8", 120, 380);
      void ring(stage, sig, "#ffe39a", 500, 40, 3);
    });

    schedule(stage, FLARE_MS + SWING_MS * 0.7, () => void streakBurst(stage, { x: target.x + w * 0.55, y: target.y + h * 0.2 }, { colors: GOLD, count: 16, angle: -0.6, cone: 0.9, speed: [140, 300], life: [0.25, 0.5], gravity: 120 }));

    const grow = el ? wait(stage, FLARE_MS).then(() => animateEl(stage, el, GROW, { duration: 900, easing: "ease-out" })) : wait(stage, 0);

    const run = tween(stage, TOTAL_MS, (k) => (t = k * TOTAL_MS)).then(hide);

    await Promise.all([run, grow]);
  });
