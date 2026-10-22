import { describe, expect, it } from "vitest";

import { cellAtScreenPoint, cellCenter, cellPolygon, fitMapBox, fitMapView, mapSize, playableBounds, tokenBox, UNIT } from "../layout";

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

describe("fitMapView", () => {
  const wide = { cols: 20, rows: 12 };

  it("без rotatable не повертає навіть у портретному контейнері", () => {
    expect(fitMapView({ width: 300, height: 600 }, wide)).toEqual({ width: 300, height: 180, rotated: false });
  });

  it("широка карта в портретному контейнері — повернута, рамка з переставленими сторонами", () => {
    expect(fitMapView({ width: 300, height: 600 }, wide, { rotatable: true })).toEqual({ width: 300, height: 500, rotated: true });
  });

  it("широка карта в широкому контейнері — без повороту", () => {
    expect(fitMapView({ width: 600, height: 300 }, wide, { rotatable: true })).toEqual({ width: 500, height: 300, rotated: false });
  });

  it("майже квадратна карта — поворот майже нічого не дає, лишається як є", () => {
    expect(fitMapView({ width: 300, height: 600 }, { cols: 11, rows: 10 }, { rotatable: true }).rotated).toBe(false);
  });

  it("висока карта в портретному контейнері — без повороту", () => {
    expect(fitMapView({ width: 300, height: 600 }, { cols: 10, rows: 20 }, { rotatable: true }).rotated).toBe(false);
  });

  it("портретний контейнер, що стиснувся під панеллю наведення, — карта лишається повернутою", () => {
    expect(fitMapView({ width: 382, height: 426 }, { cols: 15, rows: 9 }, { rotatable: true }).rotated).toBe(true);
  });

  it("fillWidth: повернута карта на всю ширину, висота більша за доступну", () => {
    expect(fitMapView({ width: 300, height: 400 }, wide, { rotatable: true, fillWidth: true })).toEqual({ width: 300, height: 500, rotated: true });
  });

  it("fillWidth без повороту: ширина екрана, висота за пропорцією", () => {
    expect(fitMapView({ width: 600, height: 100 }, wide, { fillWidth: true })).toEqual({ width: 600, height: 360, rotated: false });
  });

  it("порожній контейнер — без повороту", () => {
    expect(fitMapView({ width: 0, height: 0 }, wide, { rotatable: true })).toEqual({ width: 0, height: 0, rotated: false });
  });

  it("minCell: дрібні клітинки — рамка росте до мінімальної клітинки зі збереженням пропорцій", () => {
    expect(fitMapView({ width: 300, height: 200 }, wide, { minCell: 32 })).toEqual({ width: 640, height: 384, rotated: false });
  });

  it("minCell: клітинки й так достатні — рамка не змінюється", () => {
    expect(fitMapView({ width: 1000, height: 600 }, wide, { minCell: 32 })).toEqual({ width: 1000, height: 600, rotated: false });
  });

  it("minCell: порожній контейнер не роздувається", () => {
    expect(fitMapView({ width: 0, height: 0 }, wide, { minCell: 32 })).toEqual({ width: 0, height: 0, rotated: false });
  });
});

describe("cellAtScreenPoint", () => {
  const map = { cols: 4, rows: 2 };

  it("зсув і масштаб: 100 px на клітинку, сітка з (100, 50)", () => {
    const ctm = { a: 1, b: 0, c: 0, d: 1, e: 100, f: 50 };

    expect(cellAtScreenPoint(map, ctm, 100, 50)).toEqual({ x: 0, y: 0 });
    expect(cellAtScreenPoint(map, ctm, 499, 249)).toEqual({ x: 3, y: 1 });
    expect(cellAtScreenPoint(map, { ...ctm, a: 0.5, d: 0.5 }, 260, 110)).toEqual({ x: 3, y: 1 });
  });

  it("поворот на 90° за годинниковою: верхній рядок карти — праворуч", () => {
    // rotate(90deg) + translateX(висота сітки 200 px): (x, y) → (200 − y, x)
    const ctm = { a: 0, b: 1, c: -1, d: 0, e: 200, f: 0 };

    expect(cellAtScreenPoint(map, ctm, 190, 10)).toEqual({ x: 0, y: 0 });
    expect(cellAtScreenPoint(map, ctm, 10, 10)).toEqual({ x: 0, y: 1 });
    expect(cellAtScreenPoint(map, ctm, 190, 390)).toEqual({ x: 3, y: 0 });
  });

  it("поза сіткою або вироджена матриця — null", () => {
    const ctm = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

    expect(cellAtScreenPoint(map, ctm, 400, 10)).toBeNull();
    expect(cellAtScreenPoint(map, ctm, -1, 10)).toBeNull();
    expect(cellAtScreenPoint(map, { ...ctm, a: 0, d: 0 }, 0, 0)).toBeNull();
  });
});

describe("playableBounds", () => {
  it("без неігрових клітинок — уся карта", () => {
    expect(playableBounds({ cols: 4, rows: 3 })).toEqual({ x: 0, y: 0, cols: 4, rows: 3 });
  });

  it("поля по краях відкидаються, дірка всередині лишається", () => {
    const blocked = ["0:0", "1:0", "2:0", "3:0", "0:1", "0:2", "0:3", "3:3", "2:2"];

    expect(playableBounds({ cols: 4, rows: 4, blocked })).toEqual({ x: 1, y: 1, cols: 3, rows: 3 });
  });

  it("уся карта неігрова — повертає всю карту", () => {
    expect(playableBounds({ cols: 2, rows: 1, blocked: ["0:0", "1:0"] })).toEqual({ x: 0, y: 0, cols: 2, rows: 1 });
  });
});
