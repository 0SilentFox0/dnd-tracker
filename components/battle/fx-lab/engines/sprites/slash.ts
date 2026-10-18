import type { FxContext } from "../../types";

import { lungeOffset, wait } from "@/components/battle/fx/runtime/geometry";
import { playSheet, SHEETS } from "@/components/battle/fx/runtime/sprites";

export async function slash(ctx: FxContext) {
  const lunge = ctx.fromEl.animate([{ transform: "none" }, { transform: `translateX(${lungeOffset(ctx.from, ctx.to)}px) scale(1.06)`, offset: 0.45 }, { transform: "none" }], { duration: 420, easing: "cubic-bezier(.5,0,.2,1)" }).finished;

  await wait(230);
  ctx.impact();

  const filter = "hue-rotate(170deg) saturate(.5) brightness(1.7)";

  await Promise.all([
    playSheet(ctx.layer, SHEETS.spark, { x: ctx.to.x - 10, y: ctx.to.y - 8 }, { scale: 3.2, ms: 380, filter }),
    playSheet(ctx.layer, SHEETS.spark, { x: ctx.to.x + 14, y: ctx.to.y + 10 }, { scale: 2.2, ms: 380, filter }),
    lunge,
  ]);
}
