export interface FxPoint {
  x: number;
  y: number;
}

export function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

/** A per-frame `Math.random() < p` tuned at 60 Hz, scaled by `dt` so the emission rate is the same at any frame rate. */
export function chance(p: number, dt: number) {
  return Math.random() < p * 60 * dt;
}

/** Runs `fn` as many times this frame as `n` per 60 Hz tick; a fractional remainder runs with that probability. */
export function perTick(n: number, dt: number, fn: () => void) {
  const x = n * 60 * dt;

  for (let i = Math.floor(x) + (Math.random() < x % 1 ? 1 : 0); i > 0; i--) fn();
}

export function pick<T>(list: T[]) {
  return list[Math.floor(Math.random() * list.length)];
}

export function arcControl(from: FxPoint, to: FxPoint, lift: number): FxPoint {
  return { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - lift };
}

export function bezier(from: FxPoint, ctrl: FxPoint, to: FxPoint, t: number): FxPoint {
  const u = 1 - t;

  return { x: u * u * from.x + 2 * u * t * ctrl.x + t * t * to.x, y: u * u * from.y + 2 * u * t * ctrl.y + t * t * to.y };
}

export function lungeOffset(from: FxPoint, to: FxPoint, max = 46) {
  const dx = to.x - from.x;

  return Math.sign(dx) * Math.min(max, Math.abs(dx) * 0.35);
}

export function cubicBezier(p: readonly [FxPoint, FxPoint, FxPoint, FxPoint], t: number): FxPoint {
  const u = 1 - t;

  const a = u * u * u;

  const b = 3 * u * u * t;

  const c = 3 * u * t * t;

  const d = t * t * t;

  return { x: a * p[0].x + b * p[1].x + c * p[2].x + d * p[3].x, y: a * p[0].y + b * p[1].y + c * p[2].y + d * p[3].y };
}

export interface Debris {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot?: number;
  spin?: number;
  rest?: boolean;
}

/** Falling debris; with `floor` a piece bounces (losing speed) until it is slow enough to rest. */
export function stepBodies(list: Debris[], dt: number, gravity: number, floor?: number) {
  for (const b of list) {
    if (b.rest) continue;

    b.vy += gravity * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    if (b.rot !== undefined && b.spin !== undefined) b.rot += b.spin * dt;

    if (floor === undefined || b.y < floor || b.vy < 0) continue;

    b.y = floor;

    if (Math.abs(b.vy) < 80) b.rest = true;
    else {
      b.vy *= -0.35;
      b.vx *= 0.5;

      if (b.spin !== undefined) b.spin *= 0.5;
    }
  }
}

/** ±1: the side away from the caster (where the target's foes stand); by the field half when both share a column. */
export function farSide(target: FxPoint, from: FxPoint, fieldWidth: number) {
  const dx = target.x - from.x;

  if (Math.abs(dx) > 20) return Math.sign(dx);

  return target.x < fieldWidth / 2 ? 1 : -1;
}

/** `n` + 1 points from `a` to `b` bowed sideways by a travelling sine; the ends stay put. */
export function wavePoints(a: FxPoint, b: FxPoint, n: number, amp: number, phase: number, waves = 1.5): FxPoint[] {
  const dx = b.x - a.x;

  const dy = b.y - a.y;

  const len = Math.hypot(dx, dy) || 1;

  const nx = -dy / len;

  const ny = dx / len;

  return Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n;

    const off = Math.sin(u * Math.PI * 2 * waves + phase) * amp * Math.sin(u * Math.PI);

    return { x: a.x + dx * u + nx * off, y: a.y + dy * u + ny * off };
  });
}

/** A lightning-like polyline from `a` to `b`: `n` segments, inner points knocked sideways by up to `amp`. */
export function zigzag(a: FxPoint, b: FxPoint, n: number, amp: number): FxPoint[] {
  const dx = b.x - a.x;

  const dy = b.y - a.y;

  const len = Math.hypot(dx, dy) || 1;

  return Array.from({ length: n + 1 }, (_, i) => {
    const off = i === 0 || i === n ? 0 : rand(-amp, amp);

    return { x: a.x + (dx * i) / n - (dy / len) * off, y: a.y + (dy * i) / n + (dx / len) * off };
  });
}

/** Drops, in place and in order, the items `keep` rejects. */
export function prune<T>(list: T[], keep: (item: T) => boolean) {
  let n = 0;

  for (const item of list) if (keep(item)) list[n++] = item;

  list.length = n;
}
