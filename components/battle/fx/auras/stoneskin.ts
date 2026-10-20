import { drawLayer, staticLayer, twinkleDraw } from "./kit";
import type { AuraAnimation, AuraCtx } from "./types";

import { rand } from "@/components/battle/fx/runtime/geometry";
import { jaggedShape, stonePlate } from "@/components/battle/fx/runtime/shapes";

const PLATES = 11;

const GLINT_S = 3.2;

const spark = twinkleDraw("#fff3c0");

// Granite plates set edge to edge round the rim, painted once.
function rim(ctx: AuraCtx) {
  return staticLayer(ctx, "rim", (g) => {
    const { cx, cy, r, s } = ctx;

    g.lineWidth = r * 0.34;
    g.strokeStyle = "rgba(80,76,70,0.85)";
    g.beginPath();
    g.arc(cx, cy, r * 1.12, 0, Math.PI * 2);
    g.stroke();

    for (let i = 0; i < PLATES; i++) {
      const a = (i / PLATES) * Math.PI * 2 + rand(-0.06, 0.06);

      const size = r * rand(0.26, 0.32);

      g.save();
      g.translate(cx + Math.cos(a) * r * 1.13, cy + Math.sin(a) * r * 1.13);
      g.rotate(a + Math.PI / 2);
      g.scale(1.25, 0.85);
      stonePlate(g, jaggedShape(6, size, 0.25, 0.8), size);
      g.restore();
    }

    g.lineWidth = Math.max(1, s);
    g.strokeStyle = "rgba(30,26,22,0.9)";
    g.beginPath();
    g.arc(cx, cy, r + 0.5, 0, Math.PI * 2);
    g.stroke();
  });
}

export const stoneskinAura: AuraAnimation = {
  frame(g, ctx, t, dt) {
    const { cx, cy, r, s, parts } = ctx;

    drawLayer(g, rim(ctx));

    // A marble sheen sliding round the stone, like light on a temple column.
    const head = ((t % GLINT_S) / GLINT_S) * Math.PI * 2 - Math.PI / 2;

    g.globalCompositeOperation = "lighter";
    g.lineCap = "round";

    for (let i = 0; i < 6; i++) {
      g.globalAlpha = (1 - i / 6) * 0.45;
      g.strokeStyle = "#fff8ea";
      g.lineWidth = (3 - i * 0.35) * s;
      g.beginPath();
      g.arc(cx, cy, r * 1.13, head - (i + 1) * 0.09, head - i * 0.09);
      g.stroke();
    }

    g.globalAlpha = 1;

    // Now and then a blade's spark off the stone.
    parts.emit(1.4, dt, () => {
      const a = rand(0, Math.PI * 2);

      return { x: cx + Math.cos(a) * r * 1.25, y: cy + Math.sin(a) * r * 1.25, life: 0.35, size0: 4 * s, draw: spark };
    });
    parts.step(g, dt);
  },
};
