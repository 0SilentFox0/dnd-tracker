import { easeOutCubic } from "./easing";
import { arcControl, bezier, type FxPoint, perTick, pick, rand } from "./geometry";
import { progress, show, type Stage, tween, wake } from "./stage";
import { glow, sprite } from "./texture";

export interface EmitOptions {
  tints: string[];
  speed: [number, number];
  life: [number, number];
  scale: [number, number];
  angle?: [number, number];
  gravity?: number;
  drag?: number;
  spread?: number;
  additive?: boolean;
  alpha?: number;
}

export function emit(s: Stage, at: FxPoint, opts: EmitOptions) {
  if (s.stopped) return;

  const angle = rand(...(opts.angle ?? [0, Math.PI * 2]));

  const speed = rand(...opts.speed);

  const spread = opts.spread ?? 0;

  s.particles.add({
    x: at.x + rand(-spread, spread),
    y: at.y + rand(-spread / 3, spread / 3),
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    gravity: opts.gravity ?? 0,
    drag: opts.drag ?? 0,
    life: rand(...opts.life),
    age: 0,
    scale0: opts.scale[0],
    scale1: opts.scale[1],
    alpha0: opts.alpha ?? 1,
    tex: glow(pick(opts.tints)),
    additive: opts.additive !== false,
  });
  wake(s);
}

export async function shoot(s: Stage, from: FxPoint, to: FxPoint, ms: number, tint: string, tints: string[], wobble = 0) {
  const ctrl = arcControl(from, to, wobble ? 30 : 60);

  let pos = from;

  const halo = glow(tint);

  const core = glow("#ffffff");

  const hide = show(s, (g) => {
    sprite(g, halo, pos.x, pos.y, 30 / 32);
    sprite(g, core, pos.x, pos.y, 30 / 90);
  });

  await tween(s, ms, (k, dt) => {
    const p = bezier(from, ctrl, to, wobble ? k : k ** 1.4);

    pos = { x: p.x, y: p.y + Math.sin(k * Math.PI * 4) * wobble };

    perTick(3, dt, () => emit(s, pos, { tints, speed: [10, 50], life: [0.25, 0.5], scale: [0.45, 0.05], spread: 4 }));
  });
  hide();
}

/** An expanding ring; `squash` < 1 flattens it into an ellipse lying round a row. */
export function ring(s: Stage, at: FxPoint, color: string, ms: number, to: number, width = 3, squash = 1) {
  return progress(s, ms, (g, k) => {
    const e = easeOutCubic(k);

    g.globalAlpha = 1 - k;
    g.globalCompositeOperation = "lighter";
    g.strokeStyle = color;
    g.lineWidth = width * (1 - k) + 0.5;
    g.beginPath();
    g.ellipse(at.x, at.y, 8 + e * to, (8 + e * to) * squash, 0, 0, Math.PI * 2);
    g.stroke();
  });
}

export function flash(s: Stage, at: FxPoint, tint: string, size: number, ms: number) {
  const tex = glow(tint);

  return progress(s, ms, (g, k) => sprite(g, tex, at.x, at.y, (size / 32) * (0.4 + k), undefined, 1 - k));
}
