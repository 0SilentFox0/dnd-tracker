import { perTick } from "../runtime/geometry";
import { emit, ring, shoot } from "../runtime/primitives";
import { perTarget, pillar } from "../runtime/recipes";
import { wait } from "../runtime/stage";
import type { FxAnimation } from "./types";

import { ARCHETYPE_FX } from "@/lib/utils/battle/fx";

export const heal: FxAnimation = ({ stage, from, to, palette }) =>
  perTarget(stage, to, 0, async (target) => {
    await shoot(stage, from, target, ARCHETYPE_FX.heal.impactMs, palette.core, palette.tints);

    const rising = pillar(stage, { x: target.x, y: target.y + 30 }, { tint: palette.accent, width: 1.3, height: 4, rise: 3, holdUntil: 0.3 }, (k, dt) => {
      if (k < 0.7) perTick(2, dt, () => emit(stage, { x: target.x, y: target.y + 20 }, { tints: palette.tints, speed: [40, 110], angle: [-Math.PI * 0.6, -Math.PI * 0.4], life: [0.6, 1], scale: [0.35, 0.05], spread: 28 }));
    });

    await Promise.all([rising, ring(stage, target, palette.accent, 700, 50), wait(stage, 800)]);
  });
