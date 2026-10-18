import { emit, ring } from "../runtime/primitives";
import { perTarget, pillar } from "../runtime/recipes";
import { wait } from "../runtime/stage";
import type { FxAnimation } from "./types";

const LIGHT = ["#ffffff", "#fff1b8", "#ffd86b"];

export const summon: FxAnimation = ({ stage, to }) =>
  perTarget(stage, to, 0, async (target) => {
    const rising = pillar(stage, { x: target.x, y: target.y + 40 }, { tint: "#ffd86b", width: 1.1, height: 5, rise: 2.5, holdUntil: 0.5 }, (k) => {
      if (k < 0.6) emit(stage, { x: target.x, y: target.y + 30 }, { tints: LIGHT, speed: [30, 90], angle: [-Math.PI * 0.6, -Math.PI * 0.4], life: [0.5, 0.9], scale: [0.35, 0.05], spread: 18 });
    });

    await Promise.all([rising, ring(stage, target, "#ffd86b", 600, 55, 4), wait(stage, 1000)]);
  });
