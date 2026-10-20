import type { FxAnimation } from "./types";

import { perTick } from "@/components/battle/fx/runtime/geometry";
import { emit, shoot } from "@/components/battle/fx/runtime/primitives";
import { perTarget } from "@/components/battle/fx/runtime/recipes";
import { playSheet, SHEETS } from "@/components/battle/fx/runtime/sprites";
import { progress, wait } from "@/components/battle/fx/runtime/stage";
import { ARCHETYPE_FX } from "@/lib/utils/battle/fx";

export const debuff: FxAnimation = ({ stage, from, targets, palette }) => {
  const smoke = palette.sprite === "darkBolt" ? ["#3a0a5c", "#5a1a8a"] : palette.tints.slice(-2);

  return perTarget(stage, targets, 0, async ({ at: target }) => {
    await shoot(stage, from, target, ARCHETYPE_FX.debuff.impactMs, palette.core, palette.tints, 18);

    const draw = progress(stage, 1000, (g, k) => {
      const r = 46 * (1.4 - k * 1.1);

      g.globalAlpha = Math.sin(k * Math.PI);
      g.globalCompositeOperation = "source-over";
      g.strokeStyle = palette.accent;
      g.lineWidth = 2;
      g.beginPath();

      for (let i = 0; i < 6; i++) {
        const a = k * 4 + (i * Math.PI) / 3;

        g.moveTo(target.x + Math.cos(a) * r, target.y + Math.sin(a) * r);
        g.lineTo(target.x + Math.cos(a + 2.1) * r, target.y + Math.sin(a + 2.1) * r);
      }

      g.moveTo(target.x + r, target.y);
      g.arc(target.x, target.y, r, 0, Math.PI * 2);
      g.stroke();
    }, (v, dt) => {
      if (v < 0.8) perTick(1, dt, () => emit(stage, { x: target.x, y: target.y - 20 }, { tints: smoke, speed: [10, 40], angle: [Math.PI * 0.4, Math.PI * 0.6], life: [0.8, 1.2], scale: [0.6, 1.4], spread: 30, additive: false, alpha: 0.6 }));
    });

    await Promise.all([draw, palette.sprite === "darkBolt" ? playSheet(stage, SHEETS.darkBolt, target, { scale: 2, ms: 900, anchorY: 0.8 }) : wait(stage, 0), wait(stage, 900)]);
  });
};
