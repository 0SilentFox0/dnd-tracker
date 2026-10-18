export interface FxPoint {
  x: number;
  y: number;
}

export function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
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
