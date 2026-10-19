import { describe, expect, it } from "vitest";

import { cellAtPoint, cellCenter, cellPolygon, fitMapBox, mapSize, tokenBox, UNIT } from "../layout";

import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";

describe("квадрати", () => {
  it("розмір карти й центр клітинки", () => {
    expect(mapSize({ cols: 20, rows: 12 })).toEqual({ width: 20 * UNIT, height: 12 * UNIT });
    expect(cellCenter({ x: 2, y: 1 })).toEqual({ x: 2.5 * UNIT, y: 1.5 * UNIT });
    expect(cellPolygon({ x: 0, y: 0 }).split(" ")).toHaveLength(4);
  });

  it("токен 2×2 — центр на стику чотирьох клітинок, діаметр ~2 клітинки", () => {
    const p = createMockParticipant();

    const big = { ...p, combatStats: { ...p.combatStats, gridSize: 2 }, battleData: { ...p.battleData, position: { x: 3, y: 3 } } };

    const box = tokenBox(big);

    expect(box?.cx).toBe(4 * UNIT);
    expect(box?.cy).toBe(4 * UNIT);
    expect(box?.size).toBeGreaterThan(1.5 * UNIT);
  });

  it("учасник без позиції — без токена", () => {
    expect(tokenBox(createMockParticipant())).toBeNull();
  });
});

describe("fitMapBox", () => {
  it("широкий контейнер — обмежує висота", () => {
    expect(fitMapBox({ width: 1000, height: 300 }, { cols: 20, rows: 12 })).toEqual({ width: 500, height: 300 });
  });

  it("високий контейнер — обмежує ширина", () => {
    expect(fitMapBox({ width: 300, height: 1000 }, { cols: 20, rows: 12 })).toEqual({ width: 300, height: 180 });
  });

  it("висока карта 20×40 у широкому контейнері", () => {
    expect(fitMapBox({ width: 1000, height: 500 }, { cols: 20, rows: 40 })).toEqual({ width: 250, height: 500 });
  });
});

describe("cellAtPoint", () => {
  const map = { cols: 4, rows: 2 };

  it("переводить точку екрана в клітинку з урахуванням зсуву й масштабу", () => {
    const rect = { left: 100, top: 50, width: 400, height: 200 };

    expect(cellAtPoint(map, rect, 100, 50)).toEqual({ x: 0, y: 0 });
    expect(cellAtPoint(map, rect, 499, 249)).toEqual({ x: 3, y: 1 });
    expect(cellAtPoint(map, rect, 260, 160)).toEqual({ x: 1, y: 1 });
  });

  it("поза сіткою або нульовий розмір — null", () => {
    expect(cellAtPoint(map, { left: 0, top: 0, width: 400, height: 200 }, 400, 10)).toBeNull();
    expect(cellAtPoint(map, { left: 0, top: 0, width: 400, height: 200 }, -1, 10)).toBeNull();
    expect(cellAtPoint(map, { left: 0, top: 0, width: 0, height: 0 }, 0, 0)).toBeNull();
  });
});
