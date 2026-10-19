import { halfSize } from "../runtime/anchors";
import { clamp01, easeOutCubic, envelope } from "../runtime/easing";
import { arcControl, bezier, chance, rand } from "../runtime/geometry";
import { emit, ring } from "../runtime/primitives";
import { perTarget } from "../runtime/recipes";
import { leafPath, twinkle } from "../runtime/shapes";
import { animateEl, schedule, show, tween } from "../runtime/stage";
import { glow, spritePx } from "../runtime/texture";
import type { FxAnimation } from "./types";

import { ARCHETYPE_FX } from "@/lib/utils/battle/fx";

const ARRIVE_MS = ARCHETYPE_FX.healword.impactMs - 120;

const TOTAL_MS = 2300;

const MOTES = ["#e8ffd8", "#9ff0a0", "#5fd27a"];

const SOOTHE: Keyframe[] = [{ filter: "none" }, { filter: "brightness(1.25) saturate(1.2) drop-shadow(0 0 5px #7fe88a)", offset: 0.3 }, { filter: "none" }];

interface Blade {
  x: number;
  len: number;
  lean: number;
  born: number;
}

interface Grain {
  y: number;
  amp: number;
  phase: number;
  born: number;
}

export const healword: FxAnimation = ({ stage, from, to, targetEls }) =>
  perTarget(stage, to, 0, async (target, i) => {
    const el = targetEls[i];

    const { w, h } = halfSize(el);

    const ground = target.y + h;

    const ctrl = arcControl(from, target, 40);

    // The whispered word: three small leaves flying one after another.
    const word = [0, 1, 2].map((n) => ({ delay: n * 70, spin: rand(4, 7) }));

    const blades: Blade[] = Array.from({ length: Math.round(w / 5) }, (_, n) => ({ x: target.x - w + ((n + 0.5) / Math.round(w / 5)) * w * 2 + rand(-2, 2), len: rand(9, 17), lean: rand(-0.3, 0.3), born: ARRIVE_MS + rand(0, 260) }));

    const grain: Grain[] = Array.from({ length: 5 }, (_, n) => ({ y: target.y - h * 0.6 + (n / 4) * h * 1.2, amp: rand(1.5, 3), phase: rand(0, 6), born: ARCHETYPE_FX.healword.impactMs + n * 60 }));

    let t = 0;

    const hide = show(stage, (g) => {
      const time = t / 1000;

      g.globalCompositeOperation = "source-over";

      for (const leaf of word) {
        const k = clamp01((t - leaf.delay) / (ARRIVE_MS - 140));

        if (k <= 0 || k >= 1) continue;

        const p = bezier(from, ctrl, target, easeOutCubic(k));

        spritePx(g, glow("#7fe88a"), p.x, p.y, 16, undefined, 0.7);
        g.save();
        g.translate(p.x, p.y);
        g.rotate(time * leaf.spin);
        g.globalCompositeOperation = "source-over";
        g.globalAlpha = 1;
        leafPath(g, -7, 7, 3.6);
        g.fillStyle = "#b8f090";
        g.fill();
        g.strokeStyle = "#2e6a1e";
        g.lineWidth = 0.7;
        g.stroke();
        g.restore();
      }

      // Fresh grass springing up along the row, glistening with rain.
      for (const b of blades) {
        const k = clamp01((t - b.born) / 300);

        if (k <= 0) continue;

        const len = b.len * easeOutCubic(k) * (1 - clamp01((t - TOTAL_MS + 500) / 450));

        if (len <= 0.5) continue;

        const sway = Math.sin(time * 3 + b.x * 0.2) * 0.15 + b.lean;

        g.globalCompositeOperation = "source-over";
        g.globalAlpha = 0.95;
        g.fillStyle = "#4aa83a";
        g.beginPath();
        g.moveTo(b.x - 1.8, ground);
        g.quadraticCurveTo(b.x + sway * len * 0.4, ground - len * 0.6, b.x + sway * len, ground - len);
        g.quadraticCurveTo(b.x + sway * len * 0.3 + 0.8, ground - len * 0.5, b.x + 1.8, ground);
        g.fill();
      }

      // Young bark knitting the wounds shut: wavy green-gold grain closing in from both ends.
      for (const gr of grain) {
        const k = clamp01((t - gr.born) / 420);

        if (k <= 0) continue;

        const a = envelope(clamp01((t - gr.born) / 1100), 0.15, 0.5);

        const reach = easeOutCubic(k) * w * 0.95;

        g.globalCompositeOperation = "lighter";
        g.lineWidth = 1.5;
        g.strokeStyle = `rgba(190,240,140,${0.75 * a})`;

        for (const side of [-1, 1]) {
          g.beginPath();

          for (let d = 0; d <= reach; d += 3) {
            const x = target.x + side * (w * 0.95 - d);

            g.lineTo(x, gr.y + Math.sin(x * 0.12 + gr.phase) * gr.amp);
          }

          g.stroke();
        }
      }

      // Dew catching the light.
      const dew = envelope(clamp01((t - ARRIVE_MS) / (TOTAL_MS - ARRIVE_MS)), 0.15, 0.3);

      for (let n = 0; n < 5; n++) {
        const k = (time * 1.3 + n / 5) % 1;

        twinkle(g, target.x - w * 0.9 + ((n * 0.43) % 1) * w * 1.8, ground - 4 - (n % 3) * 4, 3.5 * Math.sin(k * Math.PI), "#e8fff0", dew);
      }

      g.globalAlpha = 1;
    });

    // The word is only whispered: soft ripples at the caster's lips.
    for (let n = 0; n < 2; n++) schedule(stage, n * 120, () => void ring(stage, from, "#9ff0a0", 450, 16, 1.5));

    // A short shower of rain-fresh droplets as the word lands.
    schedule(stage, ARRIVE_MS, () => {
      for (let n = 0; n < 16; n++) emit(stage, { x: target.x + rand(-w, w), y: target.y - h - rand(4, 18) }, { tints: ["#d8fff0", "#a8f0c8"], speed: [70, 110], angle: [Math.PI * 0.48, Math.PI * 0.52], life: [0.3, 0.45], scale: [0.14, 0.08], gravity: 200 });
    });

    schedule(stage, ARCHETYPE_FX.healword.impactMs, () => {
      if (el) void animateEl(stage, el, SOOTHE, { duration: 1100, easing: "ease-out" });
    });

    await tween(stage, TOTAL_MS, (k, dt) => {
      t = k * TOTAL_MS;

      if (t < ARRIVE_MS && chance(0.5, dt)) {
        const p = bezier(from, ctrl, target, easeOutCubic(clamp01(t / (ARRIVE_MS - 140))));

        emit(stage, p, { tints: MOTES, speed: [5, 20], life: [0.3, 0.5], scale: [0.18, 0.03] });
      }

      if (t > ARCHETYPE_FX.healword.impactMs && t < TOTAL_MS - 600 && chance(0.4, dt)) emit(stage, { x: target.x + rand(-w, w), y: ground - rand(0, h) }, { tints: MOTES, speed: [10, 30], angle: [-Math.PI * 0.7, -Math.PI * 0.3], life: [0.6, 1], scale: [0.2, 0.04], gravity: -25 });
    }).then(() => void hide());
  });
