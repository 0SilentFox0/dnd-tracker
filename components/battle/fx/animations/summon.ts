import { emit, ring } from "../runtime/primitives";
import { show, tween, wait } from "../runtime/stage";
import { glow, sprite } from "../runtime/texture";
import type { FxAnimation } from "./types";

const LIGHT = ["#ffffff", "#fff1b8", "#ffd86b"];

export const summon: FxAnimation = async ({ stage, to }) => {
  await Promise.all(
    to.map(async (target) => {
      let k = 0;

      const tex = glow("#ffd86b");

      const hide = show(stage, (g) => sprite(g, tex, target.x, target.y + 40, 1.1, 5 * Math.min(1, k * 2.5), k < 0.5 ? 1 : 1 - (k - 0.5) / 0.5, true, 0.9));

      const pillar = tween(stage, 1000, (v) => {
        k = v;

        if (v < 0.6) emit(stage, { x: target.x, y: target.y + 30 }, { tints: LIGHT, speed: [30, 90], angle: [-Math.PI * 0.6, -Math.PI * 0.4], life: [0.5, 0.9], scale: [0.35, 0.05], spread: 18 });
      }).then(hide);

      await Promise.all([pillar, ring(stage, target, "#ffd86b", 600, 55, 4), wait(stage, 1000)]);
    }),
  );
};
