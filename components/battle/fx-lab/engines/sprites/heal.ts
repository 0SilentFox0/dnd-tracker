import type { FxContext } from "../../types";

import { wait } from "@/components/battle/fx/runtime/geometry";
import { playSheet, SHEETS } from "@/components/battle/fx/runtime/sprites";

export async function heal(ctx: FxContext) {
  const filter = "hue-rotate(-75deg) brightness(1.2)";

  const rings = [0, 1].map((i) => playSheet(ctx.layer, SHEETS.rings, ctx.to, { scale: i ? 1.6 : 2.4, ms: 700, filter, delayMs: i * 160 }));

  await wait(250);
  ctx.impact();
  await Promise.all(rings);
}
