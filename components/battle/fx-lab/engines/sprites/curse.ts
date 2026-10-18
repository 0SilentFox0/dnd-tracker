import type { FxContext } from "../../types";

import { wait } from "@/components/battle/fx/runtime/geometry";
import { playSheet, SHEETS } from "@/components/battle/fx/runtime/sprites";

export async function curse(ctx: FxContext) {
  const bolt = playSheet(ctx.layer, SHEETS.darkBolt, { x: ctx.to.x, y: ctx.to.y - 50 }, { scale: 2, ms: 900 });

  await wait(420);
  ctx.impact();
  await bolt;
}
