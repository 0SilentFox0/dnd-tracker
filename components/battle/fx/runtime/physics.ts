interface Moving {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/** One step of a body under `drag` (per second) and `gravity` (px/s², down). */
export function integrate(b: Moving, dt: number, drag: number, gravity: number) {
  b.vx *= 1 - drag * dt;
  b.vy = b.vy * (1 - drag * dt) + gravity * dt;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
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
