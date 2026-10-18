import type { FxContext } from "../../types";
import { FIRE } from "./colors";

import { emit, flash, ring, shoot, type Stage } from "@/components/battle/fx/runtime/canvas";
import { wait } from "@/components/battle/fx/runtime/geometry";

export async function fireball(s: Stage, ctx: FxContext) {
  await shoot(s, ctx.from, ctx.to, 600, "#ff7a1a", FIRE);
  ctx.impact();

  for (let i = 0; i < 90; i++) emit(s, ctx.to, { tints: FIRE, speed: [60, 340], life: [0.4, 0.9], scale: [0.6, 0.05], drag: 3.5, gravity: 60 });

  await Promise.all([flash(s, ctx.to, "#ffb347", 130, 450), ring(s, ctx.to, "#ffc070", 550, 60, 5), wait(900)]);
}
