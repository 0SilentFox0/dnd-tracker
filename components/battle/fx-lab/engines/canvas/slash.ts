import type { FxContext } from "../../types";
import { STEEL } from "./colors";

import { emit, show, type Stage, tween } from "@/components/battle/fx/runtime/canvas";
import { lungeOffset, wait } from "@/components/battle/fx/runtime/geometry";

export async function slash(s: Stage, ctx: FxContext) {
  const move = ctx.fromEl.animate([{ transform: "none" }, { transform: `translateX(${lungeOffset(ctx.from, ctx.to)}px) scale(1.06)`, offset: 0.45 }, { transform: "none" }], { duration: 420, easing: "cubic-bezier(.5,0,.2,1)" }).finished;

  await wait(190);

  const cuts = [-0.6, 2.4].map(async (rot, i) => {
    await wait(i * 90);

    let k = 0;

    const hide = show(s, (g) => {
      const sweep = Math.min(1, k * 2) * 2.2;

      const start = rot + k * 0.6;

      g.globalAlpha = 1 - k * k;
      g.globalCompositeOperation = "lighter";
      g.strokeStyle = "#ffffff";
      g.lineWidth = 6 * (1 - k) + 1;
      g.lineCap = "round";
      g.beginPath();
      g.arc(ctx.to.x, ctx.to.y, 52, start, start + sweep);
      g.stroke();
    });

    await tween(s, 360, (v) => (k = v));
    hide();
  });

  await wait(80);
  ctx.impact();

  for (let i = 0; i < 40; i++) emit(s, ctx.to, { tints: STEEL, speed: [120, 380], life: [0.3, 0.6], scale: [0.25, 0.02], drag: 2, gravity: 700 });

  await Promise.all([...cuts, move, wait(600)]);
}
