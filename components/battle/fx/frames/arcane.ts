import type { FrameAnimation } from "./types";

import { perimeter } from "@/components/battle/fx/frames/kit";
import { clamp01 } from "@/components/battle/fx/runtime/easing";
import { perTick, pick, rand } from "@/components/battle/fx/runtime/geometry";
import { emit } from "@/components/battle/fx/runtime/primitives";
import { show, tween } from "@/components/battle/fx/runtime/stage";
import { glow, sprite } from "@/components/battle/fx/runtime/texture";

const SPARK = ["#f0d8ff", "#c38bff", "#9b5cff"];

// Rune glyphs as stroke lists in a unit box (0..1), drawn along the burnt fuse.
const RUNES: number[][][] = [
  [[0.5, 0, 0.5, 1], [0.5, 0.25, 0.9, 0], [0.5, 0.5, 0.9, 0.25]],
  [[0.2, 0, 0.2, 1], [0.2, 0, 0.8, 0.5], [0.8, 0.5, 0.2, 1]],
  [[0.5, 0, 0.5, 1], [0.1, 0.3, 0.9, 0.7], [0.9, 0.3, 0.1, 0.7]],
  [[0.2, 1, 0.5, 0], [0.5, 0, 0.8, 1], [0.32, 0.6, 0.68, 0.6]],
  [[0.3, 0, 0.3, 1], [0.7, 0, 0.7, 1], [0.3, 0.2, 0.7, 0.55]],
];

const RUN_MS = 1000;

const FADE_MS = 450;

const STEPS = 90;

export const arcaneFrame: FrameAnimation = async (s, box) => {
  let k = 0;

  let fade = 1;

  const start = Math.random();

  const head = glow("#e2c4ff");

  const len = 2 * (box.w + box.h);

  const runes = Array.from({ length: Math.max(6, Math.round(len / 55)) }, (_, i) => ({ t: (i + rand(0.2, 0.8)) / Math.max(6, Math.round(len / 55)), glyph: pick(RUNES) }));

  // Two fuses leave the start point in opposite directions and meet halfway round.
  const reached = (t: number) => {
    const d = (((t - start) % 1) + 1) % 1;

    return Math.min(d, 1 - d) * 2;
  };

  const hide = show(s, (g) => {
    g.save();
    g.globalCompositeOperation = "lighter";
    g.lineCap = "round";
    g.shadowColor = "#9b5cff";
    g.shadowBlur = 10;
    g.strokeStyle = `rgba(185,130,255,${0.85 * fade})`;
    g.lineWidth = 2;

    for (const dir of [1, -1]) {
      g.beginPath();

      for (let i = 0; i <= STEPS; i++) {
        const p = perimeter(box, start + (dir * (k / 2) * i) / STEPS);

        if (i) g.lineTo(p.x, p.y);
        else g.moveTo(p.x, p.y);
      }

      g.stroke();
    }

    g.lineWidth = 1.3;
    g.strokeStyle = "#f3e6ff";

    for (const r of runes) {
      const shown = clamp01((k - reached(r.t)) / 0.12);

      if (!shown) continue;

      const p = perimeter(box, r.t);

      const size = 9;

      const ox = p.x + p.nx * 9 - size / 2;

      const oy = p.y + p.ny * 9 - size / 2;

      g.globalAlpha = shown * fade;
      g.beginPath();

      for (const [x0, y0, x1, y1] of r.glyph) {
        g.moveTo(ox + x0 * size, oy + y0 * size);
        g.lineTo(ox + x1 * size, oy + y1 * size);
      }

      g.stroke();
    }

    if (k < 1) {
      for (const dir of [1, -1]) {
        const p = perimeter(box, start + (dir * k) / 2);

        sprite(g, head, p.x, p.y, 0.55, undefined, 1);
      }
    }

    g.restore();
  });

  await tween(s, RUN_MS, (v, dt) => {
    k = v;

    for (const dir of [1, -1]) {
      const p = perimeter(box, start + (dir * v) / 2);

      perTick(2, dt, () => emit(s, { x: p.x, y: p.y }, { tints: SPARK, speed: [20, 70], life: [0.25, 0.5], scale: [0.12, 0.02], drag: 2 }));
    }
  });

  const meet = perimeter(box, start + 0.5);

  for (let i = 0; i < 18; i++) emit(s, { x: meet.x, y: meet.y }, { tints: SPARK, speed: [40, 120], life: [0.3, 0.6], scale: [0.18, 0.03], drag: 2.5 });

  await tween(s, FADE_MS, (v) => {
    fade = 1 - v;
  });
  hide();
};
