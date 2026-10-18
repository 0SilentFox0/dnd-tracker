import { emit, ring, shoot } from "../runtime/primitives";
import { show, tween, wait } from "../runtime/stage";
import { glow, sprite } from "../runtime/texture";
import type { FxAnimation } from "./types";

export const heal: FxAnimation = async ({ stage, from, to, palette }) => {
  await Promise.all(
    to.map(async (target) => {
      await shoot(stage, from, target, 450, palette.core, palette.tints);

      let k = 0;

      const tex = glow(palette.tints[1] ?? palette.core);

      const hide = show(stage, (g) => sprite(g, tex, target.x, target.y + 30, 1.3, 4 * Math.min(1, k * 3), k < 0.3 ? 1 : 1 - (k - 0.3) / 0.7, true, 0.9));

      const rising = tween(stage, 1000, (v) => {
        k = v;

        if (v < 0.7) for (let i = 0; i < 2; i++) emit(stage, { x: target.x, y: target.y + 20 }, { tints: palette.tints, speed: [40, 110], angle: [-Math.PI * 0.6, -Math.PI * 0.4], life: [0.6, 1], scale: [0.35, 0.05], spread: 28 });
      }).then(hide);

      await Promise.all([rising, ring(stage, target, palette.tints[1] ?? palette.core, 700, 50), wait(stage, 800)]);
    }),
  );
};
