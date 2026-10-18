import { rand } from "../../runtime/geometry";
import { emit } from "../../runtime/primitives";
import { show, tween } from "../../runtime/stage";
import { type FrameAnimation, roundRect } from "./types";

const FLAME = ["#fff3b0", "#ffd25a", "#ff8a1f", "#ff4a00"];

const EMBER = ["#fff3b0", "#ffd25a"];

const BURN_MS = 1300;

export const fireFrame: FrameAnimation = async (s, box) => {
  let k = 0;

  const hide = show(s, (g) => {
    const heat = k < 0.12 ? k / 0.12 : 1 - (k - 0.12) / 0.88;

    const glowFill = g.createLinearGradient(0, box.y + box.h, 0, box.y);

    glowFill.addColorStop(0, `rgba(255,110,20,${0.75 * heat})`);
    glowFill.addColorStop(0.6, `rgba(255,70,0,${0.2 * heat})`);
    glowFill.addColorStop(1, "rgba(255,70,0,0)");
    g.globalAlpha = 1;
    g.globalCompositeOperation = "lighter";
    roundRect(g, box);
    g.fillStyle = glowFill;
    g.fill();
    g.shadowColor = "#ff6a00";
    g.shadowBlur = 16 * heat;
    g.strokeStyle = `rgba(255,170,60,${0.9 * heat})`;
    g.lineWidth = 2;
    roundRect(g, box);
    g.stroke();
    g.shadowBlur = 0;
  });

  const burning = tween(s, BURN_MS, (v) => {
    k = v * 0.8;

    const strength = 1 - v * 0.6;

    for (let i = 0; i < 7.5 * strength; i++) {
      const edge = Math.random();

      const at = edge < 0.6
        ? { x: box.x + rand(0, box.w), y: box.y + box.h - rand(0, 4) }
        : edge < 0.8
          ? { x: box.x + rand(-2, 3), y: box.y + rand(box.h * 0.25, box.h) }
          : { x: box.x + box.w + rand(-3, 2), y: box.y + rand(box.h * 0.25, box.h) };

      emit(s, at, { tints: FLAME, speed: [25, 75], angle: [-Math.PI * 0.62, -Math.PI * 0.38], life: [0.35, 0.75], scale: [rand(0.26, 0.48), 0.04], drag: 0.6, gravity: -40 });
    }

    if (Math.random() < 0.45) emit(s, { x: box.x + rand(0, box.w), y: box.y + box.h }, { tints: EMBER, speed: [60, 130], angle: [-Math.PI * 0.7, -Math.PI * 0.3], life: [0.6, 1.1], scale: [0.08, 0.02], gravity: -20 });
  });

  await burning;
  await tween(s, 600, (v) => {
    k = 0.8 + v * 0.2;
  });
  hide();
};
