import { emit, flash, shoot } from "../runtime/canvas";
import { wait } from "../runtime/geometry";
import { playSheet, SHEETS } from "../runtime/sprites";
import type { FxAnimation } from "./types";

export const area: FxAnimation = async ({ stage, layer, from, to, palette, spec }) => {
  if (!to.length) return;

  const center = { x: to.reduce((s, p) => s + p.x, 0) / to.length, y: to.reduce((s, p) => s + p.y, 0) / to.length };

  await shoot(stage, from, center, 650, palette.core, palette.tints);

  await Promise.all(
    to.map(async (target, i) => {
      await wait(i * 70);

      for (let n = 0; n < (spec.critical ? 70 : 40); n++) emit(stage, target, { tints: palette.tints, speed: [60, 300], life: [0.4, 0.9], scale: [0.55, 0.05], drag: 3.5, gravity: 60 });

      await Promise.all([
        flash(stage, target, palette.core, spec.critical ? 150 : 110, 450),
        palette.sprite ? playSheet(layer, SHEETS[palette.sprite], target, { scale: 2.2, ms: 560, filter: palette.filter }) : wait(0),
        wait(700),
      ]);
    }),
  );
};
