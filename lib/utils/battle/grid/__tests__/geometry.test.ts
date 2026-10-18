import { describe, expect, it } from "vitest";

import { cellDistance, cellKey, footprint, footprintDistance, inBounds, neighbors } from "../geometry";

import { GridShape } from "@/lib/constants/battle";

const sq = GridShape.SQUARE;

const hex = GridShape.HEX;

describe("квадратна сітка", () => {
  it("8 сусідів і відстань Чебишева", () => {
    expect(neighbors(sq, { x: 5, y: 5 })).toHaveLength(8);
    expect(cellDistance(sq, { x: 0, y: 0 }, { x: 3, y: 2 })).toBe(3);
    expect(cellDistance(sq, { x: 2, y: 2 }, { x: 2, y: 2 })).toBe(0);
  });

  it("footprint 2×2 від лівого верхнього якоря", () => {
    expect(footprint(sq, { x: 1, y: 1 }, 2).map(cellKey).sort()).toEqual(["1:1", "1:2", "2:1", "2:2"]);
    expect(footprint(sq, { x: 1, y: 1 }, 1)).toEqual([{ x: 1, y: 1 }]);
  });

  it("відстань між footprint — мінімум по клітинках", () => {
    const big = footprint(sq, { x: 0, y: 0 }, 2);

    expect(footprintDistance(sq, big, [{ x: 2, y: 1 }])).toBe(1);
    expect(footprintDistance(sq, big, [{ x: 4, y: 0 }])).toBe(3);
  });
});

describe("гекс-сітка (pointy-top, odd-r)", () => {
  it("6 сусідів, усі на відстані 1 — для парного й непарного рядка", () => {
    for (const p of [{ x: 4, y: 4 }, { x: 4, y: 5 }]) {
      const ns = neighbors(hex, p);

      expect(ns).toHaveLength(6);
      expect(ns.every((n) => cellDistance(hex, p, n) === 1)).toBe(true);
    }
  });

  it("відстань по рядку й по діагоналі", () => {
    expect(cellDistance(hex, { x: 0, y: 0 }, { x: 3, y: 0 })).toBe(3);
    expect(cellDistance(hex, { x: 0, y: 0 }, { x: 0, y: 2 })).toBe(2);
    expect(cellDistance(hex, { x: 0, y: 0 }, { x: 1, y: 2 })).toBe(2);
  });

  it("велика істота на гексах — якір і 6 сусідів", () => {
    expect(footprint(hex, { x: 4, y: 4 }, 2)).toHaveLength(7);
    expect(footprint(hex, { x: 4, y: 4 }, 3)).toHaveLength(7);
    expect(footprint(hex, { x: 4, y: 4 }, 1)).toHaveLength(1);
  });
});

it("межі карти", () => {
  const map = { cols: 3, rows: 2 };

  expect(inBounds(map, { x: 2, y: 1 })).toBe(true);
  expect(inBounds(map, { x: 3, y: 0 })).toBe(false);
  expect(inBounds(map, { x: 0, y: -1 })).toBe(false);
});
