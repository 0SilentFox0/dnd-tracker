export type Vec3 = [number, number, number];

export type Quat = [number, number, number, number];

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

export const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];

export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

export const len = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);

export const norm = (a: Vec3): Vec3 => scale(a, 1 / (len(a) || 1));

export function qAxisAngle(axis: Vec3, angle: number): Quat {
  const s = Math.sin(angle / 2);

  const n = norm(axis);

  return [n[0] * s, n[1] * s, n[2] * s, Math.cos(angle / 2)];
}

export function qMul(a: Quat, b: Quat): Quat {
  return [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ];
}

export function qRotate(q: Quat, v: Vec3): Vec3 {
  const u: Vec3 = [q[0], q[1], q[2]];

  const t = scale(cross(u, v), 2);

  return add(add(v, scale(t, q[3])), cross(u, t));
}

export function qFromUnitVectors(from: Vec3, to: Vec3): Quat {
  const d = dot(from, to);

  if (d < -0.999999) {
    const axis = norm(Math.abs(from[0]) < 0.9 ? cross(from, [1, 0, 0]) : cross(from, [0, 1, 0]));

    return [axis[0], axis[1], axis[2], 0];
  }

  const c = cross(from, to);

  const q: Quat = [c[0], c[1], c[2], 1 + d];

  const l = Math.hypot(q[0], q[1], q[2], q[3]);

  return [q[0] / l, q[1] / l, q[2] / l, q[3] / l];
}

export function qSlerp(a: Quat, b: Quat, t: number): Quat {
  let cos = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];

  const sign = cos < 0 ? -1 : 1;

  cos *= sign;

  let wa = 1 - t;

  let wb = t;

  if (cos < 0.9995) {
    const theta = Math.acos(cos);

    const s = Math.sin(theta);

    wa = Math.sin((1 - t) * theta) / s;
    wb = Math.sin(t * theta) / s;
  }

  const q: Quat = [wa * a[0] + sign * wb * b[0], wa * a[1] + sign * wb * b[1], wa * a[2] + sign * wb * b[2], wa * a[3] + sign * wb * b[3]];

  const l = Math.hypot(q[0], q[1], q[2], q[3]);

  return [q[0] / l, q[1] / l, q[2] / l, q[3] / l];
}
