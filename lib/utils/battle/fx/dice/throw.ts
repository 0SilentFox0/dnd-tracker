import type { DieSlot } from "./layout";
import { add, cross, dot, norm, qAxisAngle, qFromUnitVectors, qMul, qRotate, qSlerp, type Quat, scale, sub, type Vec3 } from "./math";
import { createRng } from "./rng";

export const THROW_MS = 1400;

export const DIE_RADIUS = 0.9;

// Contact times (fraction of the throw): first landing, then three decaying bounces; the value locks on the last one.
export const BOUNCE_KEYS = [0.34, 0.58, 0.77, 0.9] as const;

const PEAKS = [0.36, 0.13, 0.04] as const;

export function bounceHeight(k: number, drop: number) {
  if (k <= 0) return drop;

  if (k < BOUNCE_KEYS[0]) {
    const u = k / BOUNCE_KEYS[0];

    return drop * (1 - u * u);
  }

  for (let i = 0; i < PEAKS.length; i++) {
    if (k < BOUNCE_KEYS[i + 1]) {
      const u = (k - BOUNCE_KEYS[i]) / (BOUNCE_KEYS[i + 1] - BOUNCE_KEYS[i]);

      return 4 * PEAKS[i] * drop * u * (1 - u);
    }
  }

  return 0;
}

export const SPACING = 2.4;

export const FOV = 40;

export const FADE_MS = 250;

export const POP_MS = 1200;

export const DIM_NUMBERS = 0.82;

export interface Rig {
  pos: Vec3;
  target: Vec3;
  right: Vec3;
  up: Vec3;
  forward: Vec3;
  fov: number;
  aspect: number;
  halfW: number;
}

const GRID_MAX_W = 0.6;

const GRID_MAX_H = 0.5;

export const dieSizePx = ({ width, height }: { width: number; height: number }) => Math.min(96, Math.max(44, 0.09 * Math.min(width, height)));

export function computeRig(grid: { cols: number; rows: number }, { width, height }: { width: number; height: number }): Rig {
  const aspect = width / height;

  const needW = (Math.max(1, grid.cols) * SPACING) / 2 + 0.8;

  const needH = (Math.max(1, grid.rows) * SPACING) / 2 + 1.6;

  const t = Math.tan((FOV / 2) * (Math.PI / 180));

  const dist = Math.max(needW / (t * aspect * GRID_MAX_W), needH / (t * GRID_MAX_H), (2 * DIE_RADIUS * height) / (2 * t * dieSizePx({ width, height })));

  const elevation = (76 * Math.PI) / 180;

  const pos: Vec3 = [0, Math.sin(elevation) * dist, Math.cos(elevation) * dist + 0.4];

  const target: Vec3 = [0, 0, 0.4];

  const forward = norm(sub(target, pos));

  const right = norm(cross(forward, [0, 1, 0]));

  return { pos, target, right, up: cross(right, forward), forward, fov: FOV, aspect, halfW: needW };
}

export function projectedDiePx(rig: Rig, { width, height }: { width: number; height: number }) {
  const c: Vec3 = [0, 0, 0];

  const [x0, y0] = project(rig, c, width, height);

  const [x1, y1] = project(rig, [rig.right[0] * DIE_RADIUS, rig.right[1] * DIE_RADIUS, rig.right[2] * DIE_RADIUS], width, height);

  return 2 * Math.hypot(x1 - x0, y1 - y0);
}

export function project(rig: Rig, p: Vec3, width: number, height: number): [number, number] {
  const v = sub(p, rig.pos);

  const z = dot(v, rig.forward);

  const t = Math.tan((rig.fov / 2) * (Math.PI / 180));

  const nx = dot(v, rig.right) / (z * t * rig.aspect);

  const ny = dot(v, rig.up) / (z * t);

  return [(nx * 0.5 + 0.5) * width, (1 - (ny * 0.5 + 0.5)) * height];
}

export function slotPosition(slot: DieSlot, rowCount: number): Vec3 {
  return [(slot.col - (slot.rowLength - 1) / 2) * SPACING, 0, (slot.row - (rowCount - 1) / 2) * SPACING];
}

export interface ThrowPlan {
  start: Vec3;
  end: Vec3;
  delay: number;
  duration: number;
  drop: number;
  q0: Quat;
  axis: Vec3;
  spin: number;
  qFinal: Quat;
}

export interface Pose {
  x: number;
  z: number;
  height: number;
  q: Quat;
}

// Face normal looks exactly at the camera and the number's up vector maps to screen-up.
export function finalQuaternion(face: { normal: Vec3; up: Vec3 }, end: Vec3, rig: Rig): Quat {
  const toCam = norm(sub(rig.pos, end));

  const align = qFromUnitVectors(face.normal, toCam);

  const u = qRotate(align, face.up);

  const camUp = rig.up;

  const target = norm(sub(camUp, scale(toCam, dot(camUp, toCam))));

  const roll = qAxisAngle(toCam, Math.atan2(dot(toCam, cross(u, target)), dot(u, target)));

  return qMul(roll, align);
}

export function planThrow(seed: number, index: number, face: { normal: Vec3; up: Vec3 }, end: Vec3, rig: Rig): ThrowPlan {
  const rng = createRng(seed * 31 + index * 101 + 7);

  const axis = norm([rng() - 0.5, rng() - 0.5, rng() - 0.5]);

  const startZ = end[2] + (rng() - 0.5) * 3;

  return {
    start: [-rig.halfW * 2.4, 0, startZ],
    end,
    delay: Math.min(index * 0.06, 0.3),
    duration: THROW_MS / 1000,
    drop: 3.2 + rng() * 0.8,
    q0: qMul(qAxisAngle([rng() - 0.5, rng() - 0.5, rng() - 0.5], rng() * Math.PI * 2), [0, 0, 0, 1]),
    axis,
    spin: Math.PI * 2 * (2.5 + rng() * 2.5),
    qFinal: finalQuaternion(face, end, rig),
  };
}

const smooth = (t: number) => t * t * (3 - 2 * t);

export function sampleThrow(plan: ThrowPlan, k: number): Pose {
  const kk = Math.min(1, Math.max(0, k));

  const run = 1 - (1 - Math.min(1, kk / 0.92)) ** 2;

  const p = add(plan.start, scale(sub(plan.end, plan.start), run));

  const angle = plan.spin * (1 - (1 - kk) ** 2);

  const q = qSlerp(qMul(qAxisAngle(plan.axis, angle), plan.q0), plan.qFinal, smooth(Math.min(1, Math.max(0, (kk - 0.62) / 0.38))));

  return { x: p[0], z: p[2], height: bounceHeight(kk, plan.drop), q };
}

export function lowestY(vertices: Vec3[], q: Quat, radius: number) {
  let min = Infinity;

  for (const v of vertices) min = Math.min(min, qRotate(q, v)[1] * radius);

  return min;
}

export const settleProgress = (ms: number) => smooth(Math.min(1, Math.max(0, ms / FADE_MS)));
