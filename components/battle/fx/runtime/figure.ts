import { halfSize } from "./anchors";
import type { FxPoint } from "./geometry";

interface FigurePose {
  /** Width multiplier: 1 is a man, 1.5 a hulking giant. */
  bulk?: number;
  /** 0 — arms hang, 1 — raised to the shoulders and spread. */
  armLift?: number;
}

// The right half, from the crotch down the inner leg round to the neck, as fractions of the height.
const RIGHT: [number, number][] = [
  [0, -0.38],
  [0.05, -0.02],
  [0.16, 0],
  [0.15, -0.42],
  [0.13, -0.52],
  [0.165, -0.64],
  [0.215, -0.42],
  [0.285, -0.43],
  [0.275, -0.6],
  [0.225, -0.76],
  [0.06, -0.8],
];

const HANDS = new Set([6, 7]);

const ELBOW = 8;

/** A standing humanoid `h` tall with its feet at the origin (y grows down), clockwise from the crotch; the head is `figureHead`. */
function figureOutline(h: number, pose: FigurePose = {}): FxPoint[] {
  const bulk = pose.bulk ?? 1;

  const lift = pose.armLift ?? 0;

  const right = RIGHT.map(([x, y], i) => {
    const raise = HANDS.has(i) ? lift : i === ELBOW ? lift * 0.5 : 0;

    return { x: (x + raise * 0.12) * bulk * h, y: (y - raise * 0.3) * h };
  });

  const left = [...right].reverse().map((p) => ({ x: -p.x, y: p.y }));

  return [...right, ...left.slice(0, -1)];
}

export function figureHead(h: number, pose: FigurePose = {}) {
  return { x: 0, y: -h * 0.89, r: h * 0.09 * Math.sqrt(pose.bulk ?? 1) };
}

/** Body and head as one path; `warp` bends each outline point (flames licking, water rippling). */
export function figurePath(g: CanvasRenderingContext2D, h: number, pose: FigurePose = {}, warp?: (p: FxPoint, i: number) => FxPoint) {
  const pts = figureOutline(h, pose).map((p, i) => (warp ? warp(p, i) : p));

  const head = figureHead(h, pose);

  g.beginPath();
  pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
  g.closePath();
  g.moveTo(head.x + head.r, head.y);
  g.arc(head.x, head.y, head.r, 0, Math.PI * 2);
}

/** Height of a summoned figure standing on `ground`: tall where there is room, never past the layer's top edge. */
function figureHeight(ground: number, halfHeight: number, max = 92) {
  return Math.max(36, Math.min(max, halfHeight * 2.8, ground - 8));
}

/** Where a summoned figure stands beside the caster's row `el` centred at `at`: right of the portrait on a wide row, on the portrait itself otherwise. */
export function summonSpot(el: HTMLElement | null | undefined, at: FxPoint) {
  const { w, h } = halfSize(el);

  const ground = at.y + h - 2;

  return { x: w > h * 1.6 ? at.x + w * 0.35 : at.x, ground, height: figureHeight(ground, h), w, h };
}
