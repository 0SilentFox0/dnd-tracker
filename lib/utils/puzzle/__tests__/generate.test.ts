import { describe, expect, it } from "vitest";

import { generatePuzzle, mulberry32, pieceSize } from "../generate";

import { PUZZLE_MAX_PIECES, PUZZLE_MIN_PIECES } from "@/lib/constants/show";
import type { PuzzleCut, PuzzleSpec } from "@/types/show";

const spec = (over: Partial<PuzzleSpec> = {}): PuzzleSpec => ({ cut: "classic", count: 24, seed: 7, imageWidth: 1600, imageHeight: 900, ...over });

const CUTS: PuzzleCut[] = ["classic", "organic", "straight"];

type Pt = [number, number];

function flatten(path: string): Pt[] {
  const nums = (s: string) => s.trim().split(/[\s,]+/).map(Number);

  const pts: Pt[] = [];

  for (const [, cmd, args] of path.matchAll(/([MLC])([^MLCZ]*)/g)) {
    const n = nums(args);

    if (cmd === "C") {
      const [x0, y0] = pts[pts.length - 1];

      for (let t = 1; t <= 16; t++) {
        const k = t / 16;

        const u = 1 - k;

        pts.push([u ** 3 * x0 + 3 * u * u * k * n[0] + 3 * u * k * k * n[2] + k ** 3 * n[4], u ** 3 * y0 + 3 * u * u * k * n[1] + 3 * u * k * k * n[3] + k ** 3 * n[5]]);
      }
    } else {
      for (let i = 0; i < n.length; i += 2) pts.push([n[i], n[i + 1]]);
    }
  }

  return pts;
}

function inside(poly: Pt[], x: number, y: number): boolean {
  let hit = false;

  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];

    const [xj, yj] = poly[j];

    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }

  return hit;
}

describe("generatePuzzle", () => {
  it.each(CUTS)("%s: кожна точка карти належить рівно одному шматочку (±1 %)", (cut) => {
    const s = spec({ cut });

    const polys = generatePuzzle(s).map((p) => flatten(p.path));

    const N = 100;

    let exact = 0;

    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const x = ((i + 0.5) / N) * s.imageWidth;

        const y = ((j + 0.5) / N) * s.imageHeight;

        if (polys.filter((poly) => inside(poly, x, y)).length === 1) exact++;
      }
    }

    expect(exact / (N * N)).toBeGreaterThanOrEqual(0.99);
  });

  it.each(CUTS)("%s: детермінізм за seed, інший seed — інша нарізка", (cut) => {
    const a = generatePuzzle(spec({ cut }));

    expect(generatePuzzle(spec({ cut }))).toEqual(a);
    expect(generatePuzzle(spec({ cut, seed: 8 })).map((p) => p.path)).not.toEqual(a.map((p) => p.path));
  });

  it.each(CUTS)("%s: count клемпиться до меж", (cut) => {
    expect(generatePuzzle(spec({ cut, count: 1 })).length).toBeGreaterThanOrEqual(PUZZLE_MIN_PIECES - 1);
    expect(generatePuzzle(spec({ cut, count: 100000 })).length).toBeLessThanOrEqual(PUZZLE_MAX_PIECES);
  });

  it.each(CUTS)("%s: count=7 і максимум без дірок, id унікальні", (cut) => {
    for (const count of [7, PUZZLE_MAX_PIECES]) {
      const pieces = generatePuzzle(spec({ cut, count }));

      expect(Math.abs(pieces.length - count)).toBeLessThanOrEqual(Math.ceil(count * 0.2));
      expect(new Set(pieces.map((p) => p.id)).size).toBe(pieces.length);
    }
  });

  it("organic дає рівно count шматочків; home — центр bbox", () => {
    const pieces = generatePuzzle(spec({ cut: "organic", count: 30 }));

    expect(pieces).toHaveLength(30);

    for (const p of pieces) expect(p.home).toEqual({ x: p.bbox.x + p.bbox.w / 2, y: p.bbox.y + p.bbox.h / 2 });
  });

  it("екстремальна пропорція не перевищує максимум", () => {
    expect(generatePuzzle(spec({ count: PUZZLE_MAX_PIECES, imageWidth: 8000, imageHeight: 100 })).length).toBeLessThanOrEqual(PUZZLE_MAX_PIECES);
  });

  it("pieceSize — середня сторона bbox", () => {
    const pieces = generatePuzzle(spec({ cut: "straight", count: 16, imageWidth: 400, imageHeight: 400 }));

    expect(pieceSize(pieces)).toBeGreaterThan(70);
    expect(pieceSize(pieces)).toBeLessThan(130);
    expect(pieceSize([])).toBe(0);
  });
});

describe("mulberry32", () => {
  it("детермінований і в [0,1)", () => {
    const a = mulberry32(1);

    const b = mulberry32(1);

    for (let i = 0; i < 20; i++) {
      const v = a();

      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
