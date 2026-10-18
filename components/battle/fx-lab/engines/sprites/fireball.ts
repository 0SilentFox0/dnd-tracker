import type { FxContext } from "../../types";
import { flying } from "./shared";

import { wait } from "@/components/battle/fx/runtime/geometry";
import { playSheet, SHEETS } from "@/components/battle/fx/runtime/sprites";

export async function fireball(ctx: FxContext) {
  const ball = flying(ctx, 620);

  await wait(620);
  ball.remove();
  ctx.impact();
  await playSheet(ctx.layer, SHEETS.explosion, { x: ctx.to.x, y: ctx.to.y - 20 }, { scale: 2.6, ms: 560 });
}
