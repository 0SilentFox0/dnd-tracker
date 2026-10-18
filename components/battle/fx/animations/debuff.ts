import { emit, shoot, show, tween } from "../runtime/canvas";
import { wait } from "../runtime/geometry";
import { playSheet, SHEETS } from "../runtime/sprites";
import type { FxAnimation } from "./types";

export const debuff: FxAnimation = async ({ stage, layer, from, to, palette }) => {
  const smoke = palette.sprite === "darkBolt" ? ["#3a0a5c", "#5a1a8a"] : palette.tints.slice(-2);

  await Promise.all(
    to.map(async (target) => {
      await shoot(stage, from, target, 650, palette.core, palette.tints, 18);

      let k = 0;

      const hide = show(stage, (g) => {
        const r = 46 * (1.4 - k * 1.1);

        g.globalAlpha = Math.sin(k * Math.PI);
        g.globalCompositeOperation = "source-over";
        g.strokeStyle = palette.tints[1] ?? palette.core;
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
      });

      const draw = tween(stage, 1000, (v) => {
        k = v;

        if (v < 0.8) emit(stage, { x: target.x, y: target.y - 20 }, { tints: smoke, speed: [10, 40], angle: [Math.PI * 0.4, Math.PI * 0.6], life: [0.8, 1.2], scale: [0.6, 1.4], spread: 30, additive: false, alpha: 0.6 });
      }).then(hide);

      await Promise.all([draw, palette.sprite === "darkBolt" ? playSheet(layer, SHEETS.darkBolt, target, { scale: 2, ms: 900, anchorY: 0.8 }) : wait(0), wait(900)]);
    }),
  );
};
