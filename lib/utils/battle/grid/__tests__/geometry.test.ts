import { describe, expect, it } from "vitest";

import { cellDistance, cellKey, footprint, footprintDistance, inBounds, neighbors } from "../geometry";


describe("квадратна сітка", () => {
  it("8 сусідів і відстань Чебишева", () => {
    expect(neighbors({ x: 5, y: 5 })).toHaveLength(8);
    expect(cellDistance({ x: 0, y: 0 }, { x: 3, y: 2 })).toBe(3);
    expect(cellDistance({ x: 2, y: 2 }, { x: 2, y: 2 })).toBe(0);
  });

  it("footprint 2×2 від лівого верхнього якоря", () => {
    expect(footprint({ x: 1, y: 1 }, 2).map(cellKey).sort()).toEqual(["1:1", "1:2", "2:1", "2:2"]);
    expect(footprint({ x: 1, y: 1 }, 1)).toEqual([{ x: 1, y: 1 }]);
  });

  it("відстань між footprint — мінімум по клітинках", () => {
    const big = footprint({ x: 0, y: 0 }, 2);

    expect(footprintDistance(big, [{ x: 2, y: 1 }])).toBe(1);
    expect(footprintDistance(big, [{ x: 4, y: 0 }])).toBe(3);
  });
});

it("межі карти", () => {
  const map = { cols: 3, rows: 2 };

  expect(inBounds(map, { x: 2, y: 1 })).toBe(true);
  expect(inBounds(map, { x: 3, y: 0 })).toBe(false);
  expect(inBounds(map, { x: 0, y: -1 })).toBe(false);
});
