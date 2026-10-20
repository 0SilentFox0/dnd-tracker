import { memo, twinkleDraw } from "./kit";
import type { AuraAnimation, AuraCtx } from "./types";

import { hexPath } from "@/components/battle/fx/runtime/shapes";

const RING = 1.42;

const FLASH_S = 1.7;

const spark = twinkleDraw("#ffffff");

function cells(ctx: AuraCtx) {
  return memo(ctx, "cells", () => {
    const n = 16;

    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;

      return { a, x: ctx.cx + Math.cos(a) * ctx.r * RING, y: ctx.cy + Math.sin(a) * ctx.r * RING };
    });
  });
}

export const spellwardAura: AuraAnimation = {
  frame(g, ctx, t, dt) {
    const { r, s, parts } = ctx;

    const list = cells(ctx);

    const size = r * 0.29;

    // One cell flares now and then, as if a spell had just broken on it.
    const struck = Math.floor(t / FLASH_S) * 7 % list.length;

    const flash = Math.max(0, 1 - (t % FLASH_S) / 0.5);

    g.globalCompositeOperation = "lighter";

    list.forEach((c, i) => {
      const hue = ((c.a * 180) / Math.PI + t * 70) % 360;

      const hot = i === struck ? flash : 0;

      hexPath(g, c.x, c.y, size);
      g.globalAlpha = 0.12 + hot * 0.5;
      g.fillStyle = "#e8f4ff";
      g.fill();
      g.globalAlpha = 0.7 + hot * 0.3;
      g.strokeStyle = hot > 0.3 ? "#ffffff" : `hsl(${hue},80%,80%)`;
      g.lineWidth = (1.1 + hot) * s;
      g.stroke();
    });

    g.globalAlpha = 1;

    if ((t % FLASH_S) < dt) {
      const c = list[struck];

      for (let n = 0; n < 4; n++) parts.spawn({ x: c.x, y: c.y, vx: (Math.random() - 0.5) * 40 * s, vy: (Math.random() - 0.2) * 30 * s, gravity: 60 * s, life: 0.6, size0: 3.5 * s, draw: spark });
    }

    parts.step(g, dt);
  },
};
