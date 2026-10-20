import { describe, expect, it } from "vitest";

import { allCells, cellsByDistance, mapCentre, orthoNeighbors, samePoint } from "@/lib/utils/battle/grid/geometry";

const map = { cols: 3, rows: 2 };

describe("geometry helpers", () => {
  it("samePoint порівнює координати", () => {
    expect(samePoint({ x: 1, y: 2 }, { x: 1, y: 2 })).toBe(true);
    expect(samePoint({ x: 1, y: 2 }, { x: 2, y: 1 })).toBe(false);
  });

  it("allCells — рядками зверху вниз", () => {
    expect(allCells(map)).toEqual([
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 },
      { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 },
    ]);
  });

  it("orthoNeighbors — у порядку +x, −x, +y, −y і лише в межах карти", () => {
    expect(orthoNeighbors(map, { x: 1, y: 0 })).toEqual([{ x: 2, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 1 }]);
    expect(orthoNeighbors(map, { x: 0, y: 1 })).toEqual([{ x: 1, y: 1 }, { x: 0, y: 0 }]);
  });

  it("mapCentre — нижня середина при парних розмірах", () => {
    expect(mapCentre({ cols: 11, rows: 9 })).toEqual({ x: 5, y: 4 });
    expect(mapCentre({ cols: 4, rows: 4 })).toEqual({ x: 2, y: 2 });
  });

  it("cellsByDistance — за відстанню, при рівності рядками", () => {
    expect(cellsByDistance(map, { x: 0, y: 0 }).slice(0, 4)).toEqual([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }]);
  });
});
