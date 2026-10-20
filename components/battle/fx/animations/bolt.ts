import type { FxAnimation } from "./types";

import { ring, shoot } from "@/components/battle/fx/runtime/primitives";
import { burst, impactSplash } from "@/components/battle/fx/runtime/recipes";
import { ARCHETYPE_FX } from "@/lib/utils/battle/fx";

export const bolt: FxAnimation = async ({ stage, from, to, palette, spec }) => {
  const target = to[0];

  if (!target) return;

  await shoot(stage, from, target, ARCHETYPE_FX.bolt.impactMs, palette.core, palette.tints);

  burst(stage, target, palette.tints, spec.critical ? 180 : 90);

  await Promise.all([impactSplash(stage, target, palette, { flash: spec.critical ? 180 : 130, sheetScale: 2.6, holdMs: 700 }), ring(stage, target, palette.accent, 550, 60, 5)]);
};
