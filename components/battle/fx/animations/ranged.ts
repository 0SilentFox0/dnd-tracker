import { arcControl, bezier, type FxPoint } from "../runtime/geometry";
import { emit } from "../runtime/primitives";
import { show, tween, wait } from "../runtime/stage";
import { glow, sprite } from "../runtime/texture";
import type { FxAnimation } from "./types";

export const ranged: FxAnimation = async ({ spec, stage, from, to, palette }) => {
  const target = to[0];

  if (!target) return;

  const dir = Math.hypot(target.x - from.x, target.y - from.y) || 1;

  const end: FxPoint = spec.hit ? target : { x: target.x + ((target.x - from.x) / dir) * 40, y: target.y + ((target.y - from.y) / dir) * 40 };

  const ctrl = arcControl(from, end, 40);

  const head = glow(palette.core);

  let k = 0;

  const hide = show(stage, (g) => {
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

  await tween(stage, 380, (v) => (k = v));
  hide();

  if (spec.hit) for (let i = 0; i < 20; i++) emit(stage, target, { tints: palette.tints, speed: [60, 220], life: [0.3, 0.6], scale: [0.4, 0.03], drag: 3, gravity: 200 });

  await wait(stage, spec.hit ? 450 : 0);
};
