import { PUZZLE_MAX_PIECES, PUZZLE_MIN_PIECES } from "@/lib/constants/show";
import type { PuzzleSpec } from "@/types/show";

interface Pt {
  x: number;
  y: number;
}

export interface PuzzlePiece {
  id: string;
  path: string;
  bbox: { x: number; y: number; w: number; h: number };
  home: { x: number; y: number };
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;

  return () => {
    a = (a + 0x6d2b79f5) >>> 0;

    let t = a;

    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const fmt = (n: number) => String(Math.round(n * 100) / 100);

const clampCount = (count: number) => Math.min(PUZZLE_MAX_PIECES, Math.max(PUZZLE_MIN_PIECES, Math.round(count)));

const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

function cubicAt(p0: Pt, c1: Pt, c2: Pt, p1: Pt, t: number): Pt {
  const u = 1 - t;

  return {
    x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p1.x,
    y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p1.y,
  };
}

function makePiece(id: string, outline: Pt[]): PuzzlePiece {
  const xs = outline.map((p) => p.x);

  const ys = outline.map((p) => p.y);

  const x = Math.min(...xs);

  const y = Math.min(...ys);

  const w = Math.max(...xs) - x;

  const h = Math.max(...ys) - y;

  return { id, path: "", bbox: { x, y, w, h }, home: { x: x + w / 2, y: y + h / 2 } };
}

function polygonPiece(id: string, poly: Pt[]): PuzzlePiece {
  const piece = makePiece(id, poly);

  piece.path = `M${poly.map((p) => `${fmt(p.x)} ${fmt(p.y)}`).join("L")}Z`;

  return piece;
}

/** Ребро як ламана кубічних кривих [p0, c1, c2, p1, c1, c2, p2, …]; розворот = reverse масиву. */
function straightEdge(a: Pt, b: Pt): Pt[] {
  return [a, lerp(a, b, 1 / 3), lerp(a, b, 2 / 3), b];
}

function tabEdge(a: Pt, b: Pt, sign: 1 | -1, rng: () => number): Pt[] {
  const len = Math.hypot(b.x - a.x, b.y - a.y);

  const nx = (-(b.y - a.y) / len) * sign;

  const ny = ((b.x - a.x) / len) * sign;

  const mid = 0.5 + (rng() - 0.5) * 0.1;

  const depth = len * (0.2 + rng() * 0.05);

  const at = (u: number, v: number): Pt => ({ x: a.x + (b.x - a.x) * u + nx * v, y: a.y + (b.y - a.y) * u + ny * v });

  const neckA = at(mid - 0.1, 0);

  const neckB = at(mid + 0.1, 0);

  return [a, at(0.15, 0), at(mid - 0.15, 0), neckA, at(mid - 0.2, depth * 1.35), at(mid + 0.2, depth * 1.35), neckB, at(mid + 0.15, 0), at(0.85, 0), b];
}

function edgesPiece(id: string, edges: Pt[][]): PuzzlePiece {
  const outline: Pt[] = [];

  let d = "";

  for (const edge of edges) {
    if (!d) d = `M${fmt(edge[0].x)} ${fmt(edge[0].y)}`;

    for (let i = 0; i + 3 < edge.length; i += 3) {
      const [p0, c1, c2, p1] = edge.slice(i, i + 4);

      d += `C${fmt(c1.x)} ${fmt(c1.y)} ${fmt(c2.x)} ${fmt(c2.y)} ${fmt(p1.x)} ${fmt(p1.y)}`;

      for (let k = 0; k <= 12; k++) outline.push(cubicAt(p0, c1, c2, p1, k / 12));
    }
  }

  const piece = makePiece(id, outline);

  piece.path = `${d}Z`;

  return piece;
}

function gridSize(count: number, w: number, h: number) {
  let cols = Math.min(count, Math.max(1, Math.round(Math.sqrt((count * w) / h))));

  let rows = Math.max(1, Math.round(count / cols));

  while (cols * rows > PUZZLE_MAX_PIECES) {
    if (rows >= cols) rows--;
    else cols--;
  }

  return { cols, rows };
}

function gridPuzzle(spec: PuzzleSpec, count: number, rng: () => number): PuzzlePiece[] {
  const { imageWidth: W, imageHeight: H, cut } = spec;

  const { cols, rows } = gridSize(count, W, H);

  const cw = W / cols;

  const ch = H / rows;

  const verts: Pt[][] = Array.from({ length: rows + 1 }, (_, r) =>
    Array.from({ length: cols + 1 }, (_, c) => {
      const inner = r > 0 && r < rows && c > 0 && c < cols;

      const jitter = cut === "straight" && inner ? 0.25 : 0;

      return { x: c * cw + (rng() * 2 - 1) * jitter * cw, y: r * ch + (rng() * 2 - 1) * jitter * ch };
    }),
  );

  if (cut === "straight") {
    const pieces: PuzzlePiece[] = [];

    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) pieces.push(polygonPiece(`p${r}-${c}`, [verts[r][c], verts[r][c + 1], verts[r + 1][c + 1], verts[r + 1][c]]));

    return pieces;
  }

  const edge = (a: Pt, b: Pt, border: boolean) => (border ? straightEdge(a, b) : tabEdge(a, b, rng() < 0.5 ? 1 : -1, rng));

  const horizontal = verts.map((row, r) => row.slice(0, cols).map((a, c) => edge(a, row[c + 1], r === 0 || r === rows)));

  const vertical = Array.from({ length: rows }, (_, r) => Array.from({ length: cols + 1 }, (_, c) => edge(verts[r][c], verts[r + 1][c], c === 0 || c === cols)));

  const pieces: PuzzlePiece[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      pieces.push(edgesPiece(`p${r}-${c}`, [horizontal[r][c], vertical[r][c + 1], [...horizontal[r + 1][c]].reverse(), [...vertical[r][c]].reverse()]));
    }
  }

  return pieces;
}

function clipHalfPlane(poly: Pt[], a: number, b: number, c: number): Pt[] {
  const out: Pt[] = [];

  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i];

    const prev = poly[(i + poly.length - 1) % poly.length];

    const dc = a * cur.x + b * cur.y - c;

    const dp = a * prev.x + b * prev.y - c;

    if (dc <= 0 !== dp <= 0) out.push(lerp(prev, cur, dp / (dp - dc)));

    if (dc <= 0) out.push(cur);
  }

  return out;
}

function voronoiCells(sites: Pt[], W: number, H: number): Pt[][] {
  return sites.map((s, i) => {
    let poly: Pt[] = [
      { x: 0, y: 0 },
      { x: W, y: 0 },
      { x: W, y: H },
      { x: 0, y: H },
    ];

    for (let j = 0; j < sites.length && poly.length; j++) {
      if (j === i) continue;

      const o = sites[j];

      const a = o.x - s.x;

      const b = o.y - s.y;

      poly = clipHalfPlane(poly, a, b, (o.x * o.x + o.y * o.y - s.x * s.x - s.y * s.y) / 2);
    }

    return poly;
  });
}

function centroid(poly: Pt[]): Pt {
  let area = 0;

  let cx = 0;

  let cy = 0;

  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];

    const q = poly[(i + 1) % poly.length];

    const cross = p.x * q.y - q.x * p.y;

    area += cross;
    cx += (p.x + q.x) * cross;
    cy += (p.y + q.y) * cross;
  }

  return Math.abs(area) < 1e-9 ? poly[0] : { x: cx / (3 * area), y: cy / (3 * area) };
}

function organicPuzzle(spec: PuzzleSpec, count: number, rng: () => number): PuzzlePiece[] {
  const { imageWidth: W, imageHeight: H } = spec;

  let sites: Pt[] = Array.from({ length: count }, () => ({ x: rng() * W, y: rng() * H }));

  for (let step = 0; step < 2; step++) sites = voronoiCells(sites, W, H).map((cell, i) => (cell.length >= 3 ? centroid(cell) : sites[i]));

  return voronoiCells(sites, W, H).map((cell, i) => polygonPiece(`p${i}`, cell));
}

export function generatePuzzle(spec: PuzzleSpec): PuzzlePiece[] {
  const count = clampCount(spec.count);

  const rng = mulberry32(spec.seed);

  return spec.cut === "organic" ? organicPuzzle(spec, count, rng) : gridPuzzle(spec, count, rng);
}

export function pieceSize(pieces: PuzzlePiece[]): number {
  if (!pieces.length) return 0;

  return pieces.reduce((sum, p) => sum + (p.bbox.w + p.bbox.h) / 2, 0) / pieces.length;
}

export const pieceDiag = (piece: PuzzlePiece): number => Math.hypot(piece.bbox.w, piece.bbox.h);
