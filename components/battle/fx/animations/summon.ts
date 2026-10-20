import type { FxAnimation } from "./types";

import { perTick } from "@/components/battle/fx/runtime/geometry";
import { emit, ring } from "@/components/battle/fx/runtime/primitives";
import { perTarget, pillar } from "@/components/battle/fx/runtime/recipes";
import { wait } from "@/components/battle/fx/runtime/stage";
import { HOLY_LIGHT } from "@/components/battle/fx/runtime/swatches";

export const summon: FxAnimation = ({ stage, targets }) =>
  perTarget(stage, targets, 0, async ({ at: target }) => {
    const rising = pillar(stage, { x: target.x, y: target.y + 40 }, { tint: "#ffd86b", width: 1.1, height: 5, rise: 2.5, holdUntil: 0.5 }, (k, dt) => {
      if (k < 0.6) perTick(1, dt, () => emit(stage, { x: target.x, y: target.y + 30 }, { tints: HOLY_LIGHT, speed: [30, 90], angle: [-Math.PI * 0.6, -Math.PI * 0.4], life: [0.5, 0.9], scale: [0.35, 0.05], spread: 18 }));
    });

    await Promise.all([rising, ring(stage, target, "#ffd86b", 600, 55, 4), wait(stage, 1000)]);
  });
