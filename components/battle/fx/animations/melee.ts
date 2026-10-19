import { lungeOffset } from "../runtime/geometry";
import { emit } from "../runtime/primitives";
import { playSheet, SHEETS } from "../runtime/sprites";
import { animateEl, show, tween, wait } from "../runtime/stage";
import type { FxAnimation } from "./types";

import { ARCHETYPE_FX } from "@/lib/utils/battle/fx";

// The swing lands this long after the cut starts.
const CUT_LEAD_MS = 40;

export const melee: FxAnimation = async ({ spec, stage, from, to, actorEl, palette }) => {
  const target = to[0];

  if (!target) return;

  const move = animateEl(stage, actorEl, [{ transform: "none" }, { transform: `translateX(${lungeOffset(from, target)}px) scale(1.06)`, offset: 0.45 }, { transform: "none" }], { duration: 420, easing: "cubic-bezier(.5,0,.2,1)" });

  const at = spec.hit ? target : { x: target.x + 30, y: target.y };

  await wait(stage, ARCHETYPE_FX.melee.impactMs - CUT_LEAD_MS);

  const cuts = (spec.critical ? [-0.6, 2.4] : [-0.6]).map(async (rot, i) => {
    await wait(stage, i * 90);

    let k = 0;

    const hide = show(stage, (g) => {
      const start = rot + k * 0.6;

      g.globalAlpha = 1 - k * k;
      g.globalCompositeOperation = "lighter";
      g.strokeStyle = "#ffffff";
      g.lineWidth = 6 * (1 - k) + 1;
      g.lineCap = "round";
      g.beginPath();
      g.arc(at.x, at.y, 52, start, start + Math.min(1, k * 2) * 2.2);
      g.stroke();
    });

    await tween(stage, 360, (v) => (k = v));
    hide();
  });

  await wait(stage, CUT_LEAD_MS);

  const sparks: Promise<void>[] = [];

  if (spec.hit) {
    for (let i = 0; i < 40; i++) emit(stage, target, { tints: palette.tints, speed: [120, 380], life: [0.3, 0.6], scale: [0.25, 0.02], drag: 2, gravity: 700 });

    sparks.push(playSheet(stage, SHEETS.spark, target, { scale: 2.4, ms: 380, filter: palette.filter }));
  }

  await Promise.all([...cuts, ...sparks, move, wait(stage, 600)]);
};
