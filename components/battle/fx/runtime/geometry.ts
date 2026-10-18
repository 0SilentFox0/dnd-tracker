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
