import type { FxContext } from "../../types";
import { HEAL } from "./colors";

import { emit, glow, ring, shoot, show, sprite, type Stage, tween } from "@/components/battle/fx/runtime/canvas";
import { wait } from "@/components/battle/fx/runtime/geometry";

export async function heal(s: Stage, ctx: FxContext) {
  await shoot(s, ctx.from, ctx.to, 500, "#6dff8a", HEAL);

  let k = 0;

  const tex = glow("#9dffb0");

  const hide = show(s, (g) => sprite(g, tex, ctx.to.x, ctx.to.y + 30, 1.3, 4 * Math.min(1, k * 3), k < 0.3 ? 1 : 1 - (k - 0.3) / 0.7, true, 0.9));

  const rising = tween(s, 1000, (v) => {
    k = v;

    if (v < 0.7) for (let i = 0; i < 2; i++) emit(s, { x: ctx.to.x, y: ctx.to.y + 20 }, { tints: HEAL, speed: [40, 110], angle: [-Math.PI * 0.6, -Math.PI * 0.4], life: [0.6, 1], scale: [0.35, 0.05], spread: 28 });
  }).then(hide);

  await wait(250);
  ctx.impact();
  await Promise.all([rising, ring(s, ctx.to, "#9dffb0", 700, 50)]);
}
