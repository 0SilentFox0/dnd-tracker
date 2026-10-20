import type { FxAnimation } from "./types";

import { halfSize } from "@/components/battle/fx/runtime/anchors";
import { clamp01, easeOutCubic, envelope } from "@/components/battle/fx/runtime/easing";
import { bezier, chance, farSide, type FxPoint, rand } from "@/components/battle/fx/runtime/geometry";
import { emit, flash } from "@/components/battle/fx/runtime/primitives";
import { perTarget } from "@/components/battle/fx/runtime/recipes";
import { sword, twinkle } from "@/components/battle/fx/runtime/shapes";
import { schedule, timeline } from "@/components/battle/fx/runtime/stage";
import { glow, sprite } from "@/components/battle/fx/runtime/texture";
import { ARCHETYPE_FX } from "@/lib/utils/battle/fx";

const FILL_MS = ARCHETYPE_FX.empower.impactMs;

const TOTAL_MS = 2400;

const CHIMES = [FILL_MS, FILL_MS + 260, FILL_MS + 520];

const LEN = 80;

const INCENSE = ["#d8ccb0", "#c8b898", "#efe4c8"];

interface Stream {
  start: FxPoint;
  ctrl: FxPoint;
  end: number;
  delay: number;
}

export const empower: FxAnimation = ({ stage, from, targets }) =>
  perTarget(stage, targets, 0, async ({ at: target, el }) => {
    const { w, h } = halfSize(el);

    // The weapon is held on the side facing the enemies.
    const dir = farSide(target, from, stage.layer.clientWidth);

    const hilt = { x: target.x + dir * w * 0.55, y: target.y + h * 0.55 };

    const angle = -Math.PI / 2 + dir * 0.42;

    const along = (f: number) => ({ x: hilt.x + Math.cos(angle) * LEN * f, y: hilt.y + Math.sin(angle) * LEN * f });

    const tip = along(1);

    const streams: Stream[] = Array.from({ length: 9 }, () => {
      const a = rand(0, Math.PI * 2);

      const start = { x: target.x + Math.cos(a) * rand(90, 130), y: target.y + Math.sin(a) * rand(50, 70) };

      return { start, ctrl: { x: (start.x + hilt.x) / 2 + rand(-50, 50), y: (start.y + hilt.y) / 2 - rand(20, 60) }, end: rand(0.3, 0.9), delay: rand(0, 0.35) };
    });

    const gold = glow("#ffd86b");

    const run = timeline(
      stage,
      TOTAL_MS,
      (g, t) => {
        const life = envelope(t / TOTAL_MS, 0.08, 0.18);

        // Light flowing in along curved ribbons and pouring into the blade.
        const flow = t / FILL_MS;

        g.globalCompositeOperation = "lighter";
        g.lineCap = "round";

        for (const s of streams) {
          const head = clamp01((flow - s.delay) / (1 - s.delay)) * 1.4;

          const tail = head - 0.35;

          if (head <= 0 || tail >= 1) continue;

          g.strokeStyle = "#ffe39a";
          g.lineWidth = 2.2;
          g.globalAlpha = 0.85;
          g.beginPath();

          for (let n = 0; n <= 10; n++) {
            const p = bezier(s.start, s.ctrl, along(s.end), clamp01(tail + ((head - tail) * n) / 10));

            g.lineTo(p.x, p.y);
          }

          g.stroke();
        }

        // The blade fills with gold from hilt to tip, then flares and keeps ringing.
        const fill = clamp01((t - 150) / (FILL_MS - 150));

        const ring = Math.max(0, ...CHIMES.map((c) => (t > c ? Math.exp(-(t - c) / 160) : 0)));

        const quiver = Math.sin(t / 18) * 0.03 * ring;

        sprite(g, gold, along(0.6).x, along(0.6).y, 2.4 * fill, 2.4 * fill, life * (0.35 + ring * 0.5));

        g.save();
        g.translate(hilt.x, hilt.y);
        g.rotate(angle + quiver);
        g.globalAlpha = life * Math.min(1, t / 200);
        g.globalCompositeOperation = "source-over";
        g.shadowColor = "#ffd86b";
        g.shadowBlur = 4 + fill * 10 + ring * 12;

        const blade = g.createLinearGradient(0, 0, LEN, 0);

        blade.addColorStop(0, "#fff6d0");
        blade.addColorStop(Math.max(0.001, fill * 0.98), "#ffd86b");
        blade.addColorStop(Math.min(1, fill + 0.02), "#a8b0bc");
        blade.addColorStop(1, "#8a929e");
        sword(g, LEN, blade, "#8a6a2a");
        g.shadowBlur = 0;

        // A glint sliding up the edge as it flares.
        const glint = clamp01((t - FILL_MS) / 380);

        if (glint > 0 && glint < 1) {
          g.globalCompositeOperation = "lighter";
          g.globalAlpha = Math.sin(glint * Math.PI);
          g.fillStyle = "#ffffff";
          g.beginPath();
          g.ellipse(LEN * (0.25 + glint * 0.7), 0, 9, 2.4, 0, 0, Math.PI * 2);
          g.fill();
        }

        g.restore();

        if (t > FILL_MS) twinkle(g, tip.x, tip.y, 10 + ring * 8, "#ffffff", life * (0.4 + ring * 0.6));

        // The chime: thin rings going out from the blade like a cathedral bell.
        for (const c of CHIMES) {
          const k = (t - c) / 700;

          if (k <= 0 || k >= 1) continue;

          const mid = along(0.6);

          g.globalCompositeOperation = "lighter";
          g.globalAlpha = (1 - k) * 0.8;
          g.strokeStyle = "#fff1b8";
          g.lineWidth = 1.6;
          g.beginPath();
          g.ellipse(mid.x, mid.y, 10 + easeOutCubic(k) * 70, 6 + easeOutCubic(k) * 40, angle, 0, Math.PI * 2);
          g.stroke();
        }

        g.globalAlpha = 1;
      },
      (t, dt) => {
        // Incense: a pale trail curling up off the glowing blade.
        if (t > FILL_MS && t < TOTAL_MS - 400 && chance(0.45, dt)) {
          const p = along(rand(0.3, 1));

          emit(stage, p, { tints: INCENSE, speed: [8, 25], angle: [-Math.PI * 0.7, -Math.PI * 0.3], life: [0.8, 1.3], scale: [0.2, 0.55], additive: false, alpha: 0.3, gravity: -20 });
        }

        if (t > FILL_MS && chance(0.35, dt)) emit(stage, along(rand(0.2, 1)), { tints: ["#fff1b8", "#ffd86b"], speed: [10, 40], life: [0.3, 0.6], scale: [0.2, 0.03] });
      },
    );

    schedule(stage, FILL_MS, () => void flash(stage, tip, "#fff6d8", 90, 360));

    await run;
  });
