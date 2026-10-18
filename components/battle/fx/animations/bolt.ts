import { emit, flash, ring, shoot } from "../runtime/canvas";
import { wait } from "../runtime/geometry";
import { playSheet, SHEETS } from "../runtime/sprites";
import type { FxAnimation } from "./types";

export const bolt: FxAnimation = async ({ stage, layer, from, to, palette, spec }) => {
  const target = to[0];

  if (!target) return;

  await shoot(stage, from, target, 600, palette.core, palette.tints);

  const count = spec.critical ? 180 : 90;

  for (let i = 0; i < count; i++) emit(stage, target, { tints: palette.tints, speed: [60, 340], life: [0.4, 0.9], scale: [0.6, 0.05], drag: 3.5, gravity: 60 });

  await Promise.all([
    flash(stage, target, palette.core, spec.critical ? 180 : 130, 450),
    ring(stage, target, palette.tints[1] ?? palette.core, 550, 60, 5),
    palette.sprite ? playSheet(layer, SHEETS[palette.sprite], target, { scale: 2.6, ms: 560, filter: palette.filter }) : wait(0),
    wait(700),
  ]);
};
