import { arcControl, bezier, type FxPoint, pick, rand } from "./geometry";
import { show, type Stage, tween, wake } from "./stage";
import { glow, sprite } from "./texture";

export function emit(s: Stage, at: FxPoint, opts: { tints: string[]; speed: [number, number]; life: [number, number]; scale: [number, number]; angle?: [number, number]; gravity?: number; drag?: number; spread?: number; additive?: boolean; alpha?: number }) {
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

  await tween(s, ms, (k) => {
    const p = bezier(from, ctrl, to, wobble ? k : k ** 1.4);

    pos = { x: p.x, y: p.y + Math.sin(k * Math.PI * 4) * wobble };

    for (let i = 0; i < 3; i++) emit(s, pos, { tints, speed: [10, 50], life: [0.25, 0.5], scale: [0.45, 0.05], spread: 4 });
  });
  hide();
}

export function ring(s: Stage, at: FxPoint, color: string, ms: number, to: number, width = 3) {
  let k = 0;

  const hide = show(s, (g) => {
    const e = 1 - (1 - k) ** 3;

    g.globalAlpha = 1 - k;
    g.globalCompositeOperation = "lighter";
    g.strokeStyle = color;
    g.lineWidth = width * (1 - k) + 0.5;
    g.beginPath();
    g.arc(at.x, at.y, 8 + e * to, 0, Math.PI * 2);
    g.stroke();
  });

  return tween(s, ms, (v) => (k = v)).then(hide);
}

export function flash(s: Stage, at: FxPoint, tint: string, size: number, ms: number) {
  let k = 0;

  const tex = glow(tint);

  const hide = show(s, (g) => sprite(g, tex, at.x, at.y, (size / 32) * (0.4 + k), undefined, 1 - k));

  return tween(s, ms, (v) => (k = v)).then(hide);
}
