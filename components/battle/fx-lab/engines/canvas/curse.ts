import type { FxContext } from "../../types";
import { CURSE } from "./colors";

import { emit, shoot, show, type Stage, tween } from "@/components/battle/fx/runtime/canvas";
import { wait } from "@/components/battle/fx/runtime/geometry";

export async function curse(s: Stage, ctx: FxContext) {
  await shoot(s, ctx.from, ctx.to, 900, "#9b3dff", CURSE, 18);

  let k = 0;

  const hide = show(s, (g) => {
    const r = 46 * (1.4 - k * 1.1);

    g.globalAlpha = Math.sin(k * Math.PI);
    g.globalCompositeOperation = "source-over";
    g.strokeStyle = "#c77dff";
    g.lineWidth = 2;
    g.beginPath();

    for (let i = 0; i < 6; i++) {
      const a = k * 4 + (i * Math.PI) / 3;

      g.moveTo(ctx.to.x + Math.cos(a) * r, ctx.to.y + Math.sin(a) * r);
      g.lineTo(ctx.to.x + Math.cos(a + 2.1) * r, ctx.to.y + Math.sin(a + 2.1) * r);
    }

    g.moveTo(ctx.to.x + r, ctx.to.y);
    g.arc(ctx.to.x, ctx.to.y, r, 0, Math.PI * 2);
    g.stroke();
  });

  const draw = tween(s, 1000, (v) => {
    k = v;

    if (v < 0.8) emit(s, { x: ctx.to.x, y: ctx.to.y - 20 }, { tints: ["#3a0a5c", "#5a1a8a"], speed: [10, 40], angle: [Math.PI * 0.4, Math.PI * 0.6], life: [0.8, 1.2], scale: [0.6, 1.4], spread: 30, additive: false, alpha: 0.6 });
  }).then(hide);

  await wait(420);
  ctx.impact();
  await Promise.all([draw, wait(800)]);
}
