import { shoot } from "../runtime/primitives";
import { burst, impactSplash, perTarget } from "../runtime/recipes";
import type { FxAnimation } from "./types";

import { ARCHETYPE_FX } from "@/lib/utils/battle/fx";

export const area: FxAnimation = async ({ stage, from, to, palette, spec }) => {
  if (!to.length) return;

  const center = { x: to.reduce((s, p) => s + p.x, 0) / to.length, y: to.reduce((s, p) => s + p.y, 0) / to.length };

  await shoot(stage, from, center, ARCHETYPE_FX.area.impactMs, palette.core, palette.tints);

  await perTarget(stage, to, ARCHETYPE_FX.area.staggerMs, async (target) => {
    burst(stage, target, palette.tints, spec.critical ? 70 : 40, { speed: [60, 300], scale: [0.55, 0.05] });

    await impactSplash(stage, target, palette, { flash: spec.critical ? 150 : 110, sheetScale: 2.2, holdMs: 700 });
  });
};
