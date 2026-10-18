import { type FxPoint, rand } from "./geometry";
import { emit, type EmitOptions } from "./primitives";
import type { Stage } from "./stage";

export interface FrameBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface EdgePoint {
  x: number;
  y: number;
  nx: number;
  ny: number;
}

export function roundRect(g: CanvasRenderingContext2D, b: FrameBox, r = 6) {
  g.beginPath();
  g.roundRect(b.x, b.y, b.w, b.h, r);
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

/**
 * The frame's tinted body and glowing border. The shadow stays set afterwards (some frames draw more
 * strokes in the same glow), so reset `shadowBlur` when the next strokes must not glow.
 */
export function edgeGlow(g: CanvasRenderingContext2D, box: FrameBox, o: { fill?: string | CanvasGradient; stroke: string; width: number; shadow?: string; blur?: number; radius?: number }) {
  roundRect(g, box, o.radius);

  if (o.fill) {
    g.fillStyle = o.fill;
    g.fill();
  }

  if (o.shadow) {
    g.shadowColor = o.shadow;
    g.shadowBlur = o.blur ?? 0;
  }

  g.strokeStyle = o.stroke;
  g.lineWidth = o.width;
  g.stroke();
}

/** A bottom-to-top linear gradient over the box. */
export function verticalFill(g: CanvasRenderingContext2D, box: FrameBox, stops: [number, string][]) {
  const grad = g.createLinearGradient(0, box.y + box.h, 0, box.y);

  for (const [offset, color] of stops) grad.addColorStop(offset, color);

  return grad;
}

/** The red hit flash of the physical frames; `red` is its strength. */
export function bloodFlash(g: CanvasRenderingContext2D, box: FrameBox, red: number, o: { fill: number; blur: number; stroke: number }) {
  edgeGlow(g, box, { fill: `rgba(200,20,15,${o.fill * red})`, shadow: "#ff2a1a", blur: o.blur * red, stroke: `rgba(255,70,50,${o.stroke * red})`, width: 2 });
}

/** A random point on the border, pushed inward by `offset` px. */
export function onPerimeter(box: FrameBox, offset: [number, number] = [0, 0]): EdgePoint {
  const p = perimeter(box, Math.random());

  const d = rand(...offset);

  return { x: p.x + p.nx * d, y: p.y + p.ny * d, nx: p.nx, ny: p.ny };
}

/** `count` particles from one random border point; `inward` aims them along the inward normal ± that many radians. */
export function emitOnPerimeter(s: Stage, box: FrameBox, opts: EmitOptions, edge: { offset?: [number, number]; count?: number; inward?: number } = {}) {
  const p = onPerimeter(box, edge.offset);

  const a = Math.atan2(p.ny, p.nx);

  const o: EmitOptions = edge.inward === undefined ? opts : { ...opts, angle: [a - edge.inward, a + edge.inward] };

  for (let i = 0; i < (edge.count ?? 1); i++) emit(s, { x: p.x, y: p.y }, o);
}

/** A random point on the bottom edge, `inset` px from the corners and up to `rise` px above it. */
export function bottomPoint(box: FrameBox, inset = 0, rise = 0): FxPoint {
  return { x: box.x + rand(inset, box.w - inset), y: box.y + box.h - (rise ? rand(0, rise) : 0) };
}
