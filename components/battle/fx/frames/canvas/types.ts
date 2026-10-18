import type { Stage } from "../../runtime/canvas";

export interface FrameBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type FrameAnimation = (s: Stage, box: FrameBox) => Promise<void>;

export function roundRect(g: CanvasRenderingContext2D, b: FrameBox, r = 6) {
  g.beginPath();
  g.roundRect(b.x, b.y, b.w, b.h, r);
}

export interface EdgePoint {
  x: number;
  y: number;
  nx: number;
  ny: number;
}

// t ∈ [0, 1) walks the border clockwise from the top-left corner; (nx, ny) points inward.
export function perimeter(b: FrameBox, t: number): EdgePoint {
  const len = 2 * (b.w + b.h);

  let d = (((t % 1) + 1) % 1) * len;

  if (d < b.w) return { x: b.x + d, y: b.y, nx: 0, ny: 1 };

  d -= b.w;

  if (d < b.h) return { x: b.x + b.w, y: b.y + d, nx: -1, ny: 0 };

  d -= b.h;

  if (d < b.w) return { x: b.x + b.w - d, y: b.y + b.h, nx: 0, ny: -1 };

  return { x: b.x, y: b.y + b.h - (d - b.w), nx: 1, ny: 0 };
}

export function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}
