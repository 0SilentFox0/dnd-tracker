import { emit } from "../runtime/primitives";
import { perTarget } from "../runtime/recipes";
import { schedule, show, tween, wait } from "../runtime/stage";
import type { FxAnimation } from "./types";

import { IMPACT_MS } from "@/lib/utils/battle/fx";

export const buff: FxAnimation = ({ stage, to, palette }) =>
  perTarget(stage, to, 0, async (target) => {
    let k = 0;

    const hide = show(stage, (g) => {
      g.globalAlpha = 0.4 + k * 0.6;
      g.globalCompositeOperation = "lighter";
      g.strokeStyle = palette.core;
      g.lineWidth = 4 * (1 - k) + 1;
      g.beginPath();
      g.arc(target.x, target.y, 50 - 40 * k, 0, Math.PI * 2);
      g.stroke();
    });

    const inward = tween(stage, IMPACT_MS.buff, (v) => (k = v)).then(hide);

    for (let i = 0; i < 24; i++) {
      schedule(stage, 300 + (i / 24) * 500, () => emit(stage, target, { tints: palette.tints, speed: [20, 60], angle: [-Math.PI * 0.65, -Math.PI * 0.35], life: [0.7, 1.2], scale: [0.4, 0.05], spread: 26, gravity: -40 }));
    }

    await Promise.all([inward, wait(stage, 1500)]);
  });
