import { type FxPoint, rand } from "./geometry";

export function starPath(g: CanvasRenderingContext2D, x: number, y: number, outer: number, inner: number, points = 5, rot = -Math.PI / 2) {
  g.beginPath();

  for (let i = 0; i < points * 2; i++) {
    const a = rot + (i * Math.PI) / points;

    const rad = i % 2 ? inner : outer;

    g.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }

  g.closePath();
}

// Four-point twinkle drawn additively; k ∈ [0, 1] is its life.
export function twinkle(g: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, alpha: number) {
  g.globalCompositeOperation = "lighter";
  g.globalAlpha = Math.max(0, alpha);
  g.fillStyle = color;
  starPath(g, x, y, size, size * 0.22, 4, 0);
  g.fill();
}

export function heartPath(g: CanvasRenderingContext2D, x: number, y: number, w: number) {
  const h = w * 0.9;

  g.beginPath();
  g.moveTo(x, y + h * 0.35);
  g.bezierCurveTo(x - w * 0.6, y - h * 0.1, x - w * 0.35, y - h * 0.6, x, y - h * 0.25);
  g.bezierCurveTo(x + w * 0.35, y - h * 0.6, x + w * 0.6, y - h * 0.1, x, y + h * 0.35);
  g.closePath();
}

export function dropPath(g: CanvasRenderingContext2D, x: number, y: number, rad: number, stretch: number) {
  g.beginPath();
  g.arc(x, y, rad, 0, Math.PI);
  g.quadraticCurveTo(x - rad, y - rad * stretch * 0.6, x, y - rad * stretch);
  g.quadraticCurveTo(x + rad, y - rad * stretch * 0.6, x + rad, y);
  g.closePath();
}

/** A leaf along the x axis from `x0` to `x1`, `bulge` px wide on each side at its middle. */
export function leafPath(g: CanvasRenderingContext2D, x0: number, x1: number, bulge: number) {
  const mid = (x0 + x1) / 2;

  g.beginPath();
  g.moveTo(x0, 0);
  g.quadraticCurveTo(mid, -bulge, x1, 0);
  g.quadraticCurveTo(mid, bulge, x0, 0);
}

export function polyPath(g: CanvasRenderingContext2D, pts: FxPoint[]) {
  g.beginPath();

  for (const p of pts) g.lineTo(p.x, p.y);

  g.closePath();
}

/** An irregular polygon around the origin: `n` corners, angles jittered by ±`jitter`, radii in [minScale, 1] × size. */
export function jaggedShape(n: number, size: number, jitter: number, minScale: number): FxPoint[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + rand(-jitter, jitter);

    const d = size * rand(minScale, 1);

    return { x: Math.cos(a) * d, y: Math.sin(a) * d };
  });
}

/** Strokes the first `upTo` share of the polyline (at least one segment). */
export function polyline(g: CanvasRenderingContext2D, pts: FxPoint[], upTo = 1) {
  const n = Math.max(1, Math.floor(upTo * (pts.length - 1)));

  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);

  for (let i = 1; i <= n; i++) g.lineTo(pts[i].x, pts[i].y);

  g.stroke();
}

/** Segment i is `width × (1 − i/span × taper)` wide, never under `min`: thick at the root, thin at the tip. */
export function taperedStroke(g: CanvasRenderingContext2D, pts: FxPoint[], color: string, width: number, taper: number, min: number, span = pts.length) {
  g.strokeStyle = color;

  for (let i = 1; i < pts.length; i++) {
    g.lineWidth = Math.max(min, width * (1 - (i / span) * taper));
    g.beginPath();
    g.moveTo(pts[i - 1].x, pts[i - 1].y);
    g.lineTo(pts[i].x, pts[i].y);
    g.stroke();
  }
}
