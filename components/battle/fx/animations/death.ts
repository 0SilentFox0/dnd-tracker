import { emit, ring } from "../runtime/primitives";
import { schedule, wait } from "../runtime/stage";
import type { FxAnimation } from "./types";

export const death: FxAnimation = async ({ stage, to }) => {
  await Promise.all(
    to.map(async (target) => {
      for (let i = 0; i < 30; i++) {
        schedule(stage, (i / 30) * 400, () => emit(stage, target, { tints: ["#2a2a2e", "#4a4a52", "#1a1a1e"], speed: [10, 40], angle: [-Math.PI * 0.65, -Math.PI * 0.35], life: [0.8, 1.2], scale: [0.5, 1.2], spread: 24, gravity: -20, additive: false, alpha: 0.7 }));
      }

      await Promise.all([ring(stage, target, "#8a8a92", 700, 50, 3), wait(stage, 1300)]);
    }),
  );
};
