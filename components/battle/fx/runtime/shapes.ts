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

const TAPER_BANDS = 6;

/**
 * Segment i is `width × (1 − i/span × taper)` wide, never under `min`: thick at the root, thin at the tip.
 * Widths step in `bands` runs (one stroke each) instead of one stroke per segment.
 */
export function taperedStroke(g: CanvasRenderingContext2D, pts: FxPoint[], color: string, width: number, taper: number, min: number, span = pts.length, bands = TAPER_BANDS) {
  const n = pts.length - 1;

  const per = Math.max(1, Math.ceil(n / bands));

  g.strokeStyle = color;

  for (let from = 0; from < n; from += per) {
    const to = Math.min(n, from + per);

    g.lineWidth = Math.max(min, width * (1 - ((from + 1 + to) / 2 / span) * taper));
    g.beginPath();
    g.moveTo(pts[from].x, pts[from].y);

    for (let i = from + 1; i <= to; i++) g.lineTo(pts[i].x, pts[i].y);

    g.stroke();
  }
}

/** An iron cuff seen from the front, `r` px across its long axis, tilted by `angle`. */
export function shackle(g: CanvasRenderingContext2D, x: number, y: number, r: number, angle: number) {
  g.save();
  g.translate(x, y);
  g.rotate(angle);
  g.lineCap = "round";
  g.strokeStyle = "#141018";
  g.lineWidth = r * 0.5;
  g.beginPath();
  g.ellipse(0, 0, r, r * 0.42, 0, 0, Math.PI * 2);
  g.stroke();

  const steel = g.createLinearGradient(0, -r * 0.6, 0, r * 0.6);

  steel.addColorStop(0, "#c4c0cc");
  steel.addColorStop(0.45, "#6c6876");
  steel.addColorStop(1, "#2c2834");
  g.strokeStyle = steel;
  g.lineWidth = r * 0.3;
  g.stroke();
  g.strokeStyle = "rgba(255,255,255,0.55)";
  g.lineWidth = Math.max(0.8, r * 0.07);
  g.beginPath();
  g.ellipse(0, 0, r, r * 0.42, 0, Math.PI * 1.1, Math.PI * 1.55);
  g.stroke();
  g.fillStyle = "#2c2834";
  g.strokeStyle = "#8a8696";
  g.lineWidth = Math.max(0.6, r * 0.06);
  g.beginPath();
  g.rect(-r * 0.2, r * 0.22, r * 0.4, r * 0.38);
  g.fill();
  g.stroke();
  g.restore();
}

/** One chain link at (x, y) along `angle`: `flat` links face the viewer, the others are seen edge on. */
export function chainLink(g: CanvasRenderingContext2D, x: number, y: number, angle: number, flat: boolean, scale = 1, light = "#6e6480") {
  g.save();
  g.translate(x, y);
  g.rotate(angle);
  g.beginPath();
  g.ellipse(0, 0, 7 * scale, (flat ? 3.6 : 1.4) * scale, 0, 0, Math.PI * 2);
  g.strokeStyle = "#1c1822";
  g.lineWidth = 3.4 * scale;
  g.stroke();
  g.strokeStyle = light;
  g.lineWidth = 1.3 * scale;
  g.stroke();
  g.restore();
}

/** A curved thorn standing on the origin, its tip `len` px up and bent `bend` px sideways. */
export function thornPath(g: CanvasRenderingContext2D, len: number, width: number, bend: number) {
  g.beginPath();
  g.moveTo(-width, 0);
  g.quadraticCurveTo(-width * 0.25, -len * 0.55, bend, -len);
  g.quadraticCurveTo(width * 0.55, -len * 0.45, width, 0);
  g.closePath();
}

const RUST = ["#5a2a10", "#8a3e14", "#a8521c", "#3a1a0a", "#c0682a"];

export interface RustPatch {
  scabs: { x: number; y: number; pts: FxPoint[]; color: string }[];
  pits: FxPoint[];
}

/** A corroded patch about `r` px across: mottled jagged scabs of rust with black pits, drawn by `drawRustPatch`. */
export function rustPatch(r: number): RustPatch {
  return {
    scabs: Array.from({ length: 7 }, (_, n) => ({ x: rand(-r, r) * 0.55, y: rand(-r, r) * 0.45, pts: jaggedShape(7, r * rand(0.35, 0.6), 0.4, 0.45), color: RUST[n % RUST.length] })),
    pits: Array.from({ length: 6 }, () => ({ x: rand(-r, r) * 0.6, y: rand(-r, r) * 0.45 })),
  };
}

export function drawRustPatch(g: CanvasRenderingContext2D, patch: RustPatch, pit = 1.3) {
  for (const sc of patch.scabs) {
    g.save();
    g.translate(sc.x, sc.y);
    polyPath(g, sc.pts);
    g.fillStyle = sc.color;
    g.fill();
    g.restore();
  }

  g.fillStyle = "#0c0604";

  for (const p of patch.pits) {
    g.beginPath();
    g.arc(p.x, p.y, pit, 0, Math.PI * 2);
    g.fill();
  }
}

/** A small puffy cloud centred on (x, y), `w` px wide: overlapping puffs filled as one shape. */
export function cloudPath(g: CanvasRenderingContext2D, x: number, y: number, w: number) {
  const puffs: [number, number, number][] = [[-0.32, 0.08, 0.2], [-0.12, -0.1, 0.26], [0.14, -0.14, 0.24], [0.34, 0.04, 0.19], [0.02, 0.1, 0.26]];

  g.beginPath();

  for (const [px, py, pr] of puffs) {
    g.moveTo(x + px * w + pr * w, y + py * w);
    g.arc(x + px * w, y + py * w, pr * w, 0, Math.PI * 2);
  }
}

/** A feather along the x axis from its quill at the origin to its tip at `len`. */
export function feather(g: CanvasRenderingContext2D, len: number, fill: string, shaft: string) {
  const w = len * 0.2;

  g.beginPath();
  g.moveTo(len * 0.12, 0);
  g.bezierCurveTo(len * 0.3, -w * 1.2, len * 0.85, -w, len, 0);
  g.bezierCurveTo(len * 0.8, w * 0.7, len * 0.3, w * 1.1, len * 0.12, 0);
  g.fillStyle = fill;
  g.fill();
  g.strokeStyle = shaft;
  g.lineWidth = Math.max(0.6, len * 0.05);
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(len * 0.95, 0);
  g.stroke();
}

/** A granite plate: grey body lit from the top-left, a pale chipped edge and one marble vein. */
export function stonePlate(g: CanvasRenderingContext2D, pts: FxPoint[], size: number) {
  const grad = g.createLinearGradient(-size, -size, size, size);

  grad.addColorStop(0, "#b4aea4");
  grad.addColorStop(0.5, "#7c7770");
  grad.addColorStop(1, "#4a4640");
  polyPath(g, pts);
  g.fillStyle = grad;
  g.fill();
  g.strokeStyle = "#2a2622";
  g.lineWidth = Math.max(0.8, size * 0.12);
  g.stroke();
  g.strokeStyle = "rgba(236,230,218,0.55)";
  g.lineWidth = Math.max(0.6, size * 0.08);
  g.beginPath();
  g.moveTo(pts[0].x * 0.7, pts[0].y * 0.7);
  g.quadraticCurveTo(0, size * 0.15, pts[Math.floor(pts.length / 2)].x * 0.6, pts[Math.floor(pts.length / 2)].y * 0.6);
  g.stroke();
}

/** A «+» centred on (x, y), `size` px across. */
export function plusSign(g: CanvasRenderingContext2D, x: number, y: number, size: number, fill: string) {
  const h = size / 2;

  const w = h * 0.36;

  g.fillStyle = fill;
  g.fillRect(x - w, y - h, w * 2, h * 2);
  g.fillRect(x - h, y - w, h * 2, w * 2);
}

/** A sword along the x axis: pommel at the origin, tip at `len`. Fills the blade with `blade`, hilt and guard with `hilt`. */
export function sword(g: CanvasRenderingContext2D, len: number, blade: string | CanvasGradient, hilt: string) {
  const grip = len * 0.2;

  const w = len * 0.055;

  g.beginPath();
  g.moveTo(grip, -w);
  g.lineTo(len * 0.86, -w * 0.8);
  g.lineTo(len, 0);
  g.lineTo(len * 0.86, w * 0.8);
  g.lineTo(grip, w);
  g.closePath();
  g.fillStyle = blade;
  g.fill();
  g.fillStyle = hilt;
  g.fillRect(grip - len * 0.025, -len * 0.14, len * 0.05, len * 0.28);
  g.fillRect(len * 0.02, -w * 0.6, grip - len * 0.02, w * 1.2);
  g.beginPath();
  g.arc(len * 0.02, 0, w * 1.1, 0, Math.PI * 2);
  g.fill();
}

export function hexPath(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.beginPath();

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;

    g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }

  g.closePath();
}

/** An arrow with its tip at the origin and the shaft running back along −x for `len`. */
export function arrow(g: CanvasRenderingContext2D, len: number, shaft = "#8a5a2b", fletch = "#efe6d2") {
  g.lineCap = "round";
  g.strokeStyle = shaft;
  g.lineWidth = Math.max(1, len * 0.06);
  g.beginPath();
  g.moveTo(-len * 0.1, 0);
  g.lineTo(-len, 0);
  g.stroke();
  g.fillStyle = "#cfd6dc";
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(-len * 0.16, -len * 0.07);
  g.lineTo(-len * 0.16, len * 0.07);
  g.closePath();
  g.fill();
  g.fillStyle = fletch;

  for (const side of [-1, 1]) {
    g.beginPath();
    g.moveTo(-len * 0.82, 0);
    g.lineTo(-len * 1.02, side * len * 0.1);
    g.lineTo(-len * 0.94, 0);
    g.closePath();
    g.fill();
  }
}

/** Fills and strokes a crescent moon of radius `R` centred on (x, y), its hollow towards the upper right. */
export function crescent(g: CanvasRenderingContext2D, x: number, y: number, R: number) {
  g.save();
  g.beginPath();
  g.rect(x - R * 2, y - R * 2, R * 4, R * 4);
  g.arc(x + R * 0.5, y - R * 0.2, R * 0.82, 0, Math.PI * 2);
  g.clip("evenodd");
  g.beginPath();
  g.arc(x, y, R, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.restore();
}
