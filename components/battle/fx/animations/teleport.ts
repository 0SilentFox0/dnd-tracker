import { pulse } from "../runtime/easing";
import { emit, flash } from "../runtime/primitives";
import { perTarget } from "../runtime/recipes";
import { show, tween, wait } from "../runtime/stage";
import { glow, sprite } from "../runtime/texture";
import type { FxAnimation } from "./types";

import { IMPACT_MS } from "@/lib/utils/battle/fx";

const OUT_MS = IMPACT_MS.teleport;

const GAP_MS = 250;

const IN_MS = 250;

export const teleport: FxAnimation = async ({ stage, to, palette }) => {
  const tex = glow("#bfe6ff");

  const core = glow("#ffffff");

  await perTarget(stage, to, 0, async (target) => {
    let width = 1;

    let height = 0.6;

    let alpha = 0;

    const hide = show(stage, (g) => {
      if (alpha <= 0) return;

      sprite(g, tex, target.x, target.y, width, height * 2.2, alpha);
      sprite(g, core, target.x, target.y, width * 0.35, height * 2, alpha);
    });

    await tween(stage, OUT_MS, (k) => {
      width = 0.9 * (1 - k) + 0.12;
      height = 0.7 + k * 0.5;
      alpha = pulse(k, 0.2);
    });

    for (let i = 0; i < 20; i++) emit(stage, target, { tints: palette.tints, speed: [40, 190], life: [0.4, 0.8], scale: [0.4, 0.05], drag: 3 });

    await wait(stage, GAP_MS);

    // The flash outlasts the fade-in; awaited so the run ends with nothing left drawing.
    const flashed = flash(stage, target, "#bfe6ff", 70, 300);

    await tween(stage, IN_MS, (k) => {
      width = 0.12 + 0.8 * k;
      height = 1.2 - k * 0.5;
      alpha = pulse(k, 0.5);
    });
    hide();
    await flashed;
  });
};
