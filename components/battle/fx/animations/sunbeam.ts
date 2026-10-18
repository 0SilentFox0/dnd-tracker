import { halfSize } from "../runtime/anchors";
import { clamp01, easeOutCubic, envelope } from "../runtime/easing";
import { rand } from "../runtime/geometry";
import { emit, ring } from "../runtime/primitives";
import { perTarget } from "../runtime/recipes";
import { plusSign, twinkle } from "../runtime/shapes";
import { schedule, show, tween } from "../runtime/stage";
import { glow, sprite } from "../runtime/texture";
import type { FxAnimation } from "./types";

import { IMPACT_MS } from "@/lib/utils/battle/fx";

const BEAM_MS = IMPACT_MS.sunbeam;

const TOTAL_MS = 2600;

const WARM = ["#ffffff", "#fff1b8", "#ffd86b", "#ffb347"];

// A small sun: a hot disc and petal-like rays unfolding round it.
function sun(g: CanvasRenderingContext2D, x: number, y: number, r: number, bloom: number, spin: number, alpha: number) {
  g.save();
  g.translate(x, y);
  g.globalCompositeOperation = "lighter";
  g.globalAlpha = alpha;

  for (let n = 0; n < 12; n++) {
    const a = (n / 12) * Math.PI * 2 + spin;

    const len = r * (1.5 + (n % 2) * 0.6) * bloom;

    g.save();
    g.rotate(a);
    g.fillStyle = n % 2 ? "rgba(255,210,110,0.7)" : "rgba(255,240,190,0.85)";
    g.beginPath();
    g.moveTo(r * 0.7, -r * 0.28);
    g.quadraticCurveTo(r + len * 0.5, 0, r * 0.7 + len, 0);
    g.quadraticCurveTo(r + len * 0.5, 0, r * 0.7, r * 0.28);
    g.closePath();
    g.fill();
    g.restore();
  }

  const disc = g.createRadialGradient(0, 0, 0, 0, 0, r);

  disc.addColorStop(0, "#ffffff");
  disc.addColorStop(0.55, "#fff1b8");
  disc.addColorStop(1, "rgba(255,190,80,0.9)");
  g.fillStyle = disc;
  g.beginPath();
  g.arc(0, 0, r * Math.min(1, bloom * 1.4), 0, Math.PI * 2);
  g.fill();
  g.restore();
}

export const sunbeam: FxAnimation = ({ stage, to, targetEls }) =>
  perTarget(stage, to, 0, async (target, i) => {
    const { w, h } = halfSize(targetEls[i]);

    const at = { x: target.x, y: Math.max(16, target.y - h - 34) };

    const wounds = Array.from({ length: 5 }, () => ({ x: target.x + rand(-w * 0.7, w * 0.7), y: target.y + rand(-h * 0.5, h * 0.5), delay: rand(0, 350) }));

    const halo = glow("#ffd86b");

    const hot = glow("#fff6d8");

    const pluses = Array.from({ length: 6 }, (_, n) => ({ x: target.x + rand(-w * 0.75, w * 0.75), y: target.y + rand(-h * 0.2, h * 0.5), born: BEAM_MS + 80 + n * 110 }));

    let t = 0;

    const hide = show(stage, (g) => {
      const life = 1 - clamp01((t - TOTAL_MS + 700) / 700);

      const bloom = easeOutCubic(clamp01(t / 520));

      sprite(g, halo, at.x, at.y, 2.6 * bloom, undefined, 0.8 * life);
      sun(g, at.x, at.y, 11, bloom, t / 1400, life);

      // The rays reach down through the armour, straight to the heart.
      const beam = clamp01((t - BEAM_MS + 160) / 160) * life;

      if (beam > 0) {
        const grad = g.createLinearGradient(0, at.y, 0, target.y + h);

        grad.addColorStop(0, "rgba(255,236,170,0.55)");
        grad.addColorStop(1, "rgba(255,236,170,0.12)");
        g.globalCompositeOperation = "lighter";
        g.globalAlpha = beam;
        g.fillStyle = grad;
        g.beginPath();
        g.moveTo(at.x - 9, at.y);
        g.lineTo(at.x + 9, at.y);
        g.lineTo(target.x + w * 0.85, target.y + h);
        g.lineTo(target.x - w * 0.85, target.y + h);
        g.closePath();
        g.fill();
        sprite(g, hot, target.x, target.y, (w * 2) / 64, (h * 2.2) / 64, beam * 0.5);
      }

      // The wounds light up from inside and close.
      for (const wd of wounds) {
        const k = (t - BEAM_MS - wd.delay) / 600;

        if (k <= 0 || k >= 1) continue;

        twinkle(g, wd.x, wd.y, 9 * (1 - k * 0.6), "#ffffff", Math.sin(k * Math.PI));
        sprite(g, hot, wd.x, wd.y, 0.5 * (1 - k), undefined, 1 - k);
      }

      for (const p of pluses) {
        const k = (t - p.born) / 1000;

        if (k <= 0 || k >= 1) continue;

        g.globalCompositeOperation = "lighter";
        g.globalAlpha = envelope(k, 0.15, 0.4);
        plusSign(g, p.x, p.y - easeOutCubic(k) * 30, 11, "#fff1b8");
      }

      g.globalAlpha = 1;
    });

    schedule(stage, BEAM_MS, () => void ring(stage, target, "#ffe39a", 800, w * 0.9, 3, 0.45));

    const run = tween(stage, TOTAL_MS, (k) => {
      t = k * TOTAL_MS;

      if (t > BEAM_MS - 150 && t < TOTAL_MS - 600 && Math.random() < 0.7) {
        const u = rand(0, 1);

        emit(stage, { x: at.x + (rand(-1, 1) * w * 0.8 * u), y: at.y + (target.y + h - at.y) * u }, { tints: WARM, speed: [5, 25], life: [0.5, 0.9], scale: [0.18, 0.03], gravity: 10 });
      }
    }).then(hide);

    await run;
  });
