import { describe, expect, it } from "vitest";

import { cellDistance, cellKey, cellLine, footprint, footprintDistance, inBounds, neighbors } from "../geometry";


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

describe("cellLine", () => {
  it("та сама клітинка — одна клітинка", () => {
    expect(cellLine({ x: 2, y: 2 }, { x: 2, y: 2 })).toEqual([{ x: 2, y: 2 }]);
  });

  it("горизонталь, вертикаль і діагональ без пропусків, з обома кінцями", () => {
    expect(cellLine({ x: 0, y: 1 }, { x: 3, y: 1 }).map(cellKey)).toEqual(["0:1", "1:1", "2:1", "3:1"]);
    expect(cellLine({ x: 2, y: 3 }, { x: 2, y: 0 }).map(cellKey)).toEqual(["2:3", "2:2", "2:1", "2:0"]);
    expect(cellLine({ x: 0, y: 0 }, { x: 2, y: 2 }).map(cellKey)).toEqual(["0:0", "1:1", "2:2"]);
  });

  it("похила лінія — сусідні кроки (Чебишев 1)", () => {
    const line = cellLine({ x: 0, y: 0 }, { x: 7, y: 3 });

    expect(line).toHaveLength(8);
    expect(line.at(-1)).toEqual({ x: 7, y: 3 });

    for (let i = 1; i < line.length; i++) expect(cellDistance(line[i - 1], line[i])).toBe(1);
  });
});
