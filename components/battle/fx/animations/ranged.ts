import type { FxAnimation } from "./types";

import { arcControl, bezier, type FxPoint } from "@/components/battle/fx/runtime/geometry";
import { emit } from "@/components/battle/fx/runtime/primitives";
import { progress, wait } from "@/components/battle/fx/runtime/stage";
import { glow, sprite } from "@/components/battle/fx/runtime/texture";
import { ARCHETYPE_FX } from "@/lib/utils/battle/fx";

export const ranged: FxAnimation = async ({ spec, stage, from, to, palette }) => {
  const target = to[0];

  if (!target) return;

  const dir = Math.hypot(target.x - from.x, target.y - from.y) || 1;

  const end: FxPoint = spec.hit ? target : { x: target.x + ((target.x - from.x) / dir) * 40, y: target.y + ((target.y - from.y) / dir) * 40 };

  const ctrl = arcControl(from, end, 40);

  const head = glow(palette.core);

  await progress(stage, ARCHETYPE_FX.ranged.impactMs, (g, k) => {
    const p = bezier(from, ctrl, end, k);

    const q = bezier(from, ctrl, end, Math.max(0, k - 0.02));

    const len = Math.hypot(p.x - q.x, p.y - q.y) || 1;

    g.globalAlpha = spec.hit || k < 0.7 ? 1 : Math.max(0, (1 - k) / 0.3);
    g.globalCompositeOperation = "lighter";
    g.strokeStyle = palette.tints[0] ?? "#ffffff";
    g.lineWidth = 2;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(p.x - ((p.x - q.x) / len) * 24, p.y - ((p.y - q.y) / len) * 24);
    g.lineTo(p.x, p.y);
    g.stroke();
    sprite(g, head, p.x, p.y, 0.45, undefined, g.globalAlpha);
  });

  if (spec.hit) for (let i = 0; i < 20; i++) emit(stage, target, { tints: palette.tints, speed: [60, 220], life: [0.3, 0.6], scale: [0.4, 0.03], drag: 3, gravity: 200 });

  await wait(stage, spec.hit ? 450 : 0);
};
