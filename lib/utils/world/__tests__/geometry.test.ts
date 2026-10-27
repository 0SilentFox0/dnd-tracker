import { describe, expect, it } from "vitest";

import { clamp01, closePolygon, fitBox, polygonCentroid, toMapPoint } from "../geometry";

describe("toMapPoint", () => {
  it("zoom 1 без зсуву: центр → 0.5", () => {
    expect(toMapPoint({ x: 150, y: 100 }, { left: 100, top: 50, width: 100, height: 100 }, { zoom: 1, offset: { x: 0, y: 0 } })).toEqual({ x: 0.5, y: 0.5 });
  });

  it("враховує zoom, offset і letterbox", () => {
    const p = toMapPoint({ x: 740, y: 330 }, { left: 40, top: 10, width: 400, height: 200 }, { zoom: 2.5, offset: { x: -300, y: -120 } });

    expect(p.x).toBeCloseTo((740 - 40 + 300) / 1000);
    expect(p.y).toBeCloseTo((330 - 10 + 120) / 500);
  });

  it("поза картинкою обрізає до 0/1", () => {
    const box = { left: 10, top: 10, width: 100, height: 100 };

    expect(toMapPoint({ x: -50, y: 999 }, box, { zoom: 1, offset: { x: 0, y: 0 } })).toEqual({ x: 0, y: 1 });
    expect(clamp01(2)).toBe(1);
  });
});

describe("closePolygon", () => {
  const a = { x: 0.1, y: 0.1 };

  const b = { x: 0.5, y: 0.1 };

  const c = { x: 0.5, y: 0.5 };

  it("3 вершини → замкнений полігон", () => {
    expect(closePolygon([a, b, c])).toEqual([[0.1, 0.1], [0.5, 0.1], [0.5, 0.5], [0.1, 0.1]]);
  });

  it("дубль-клік зливається", () => {
    expect(closePolygon([a, b, c, { x: 0.5005, y: 0.5 }])?.length).toBe(4);
  });

  it("остання = перша прибирається", () => {
    expect(closePolygon([a, b, c, { ...a }])?.length).toBe(4);
  });

  it("2 унікальні → null", () => {
    expect(closePolygon([a, b, { ...b }])).toBeNull();
    expect(closePolygon([a, b, { ...a }])).toBeNull();
  });
});

describe("polygonCentroid", () => {
  it("квадрат → центр", () => {
    const c = polygonCentroid([[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]);

    expect(c.x).toBeCloseTo(0.5);
    expect(c.y).toBeCloseTo(0.5);
  });

  it("L-подібний: відомий центроїд", () => {
    const c = polygonCentroid([[0, 0], [2, 0], [2, 1], [1, 1], [1, 2], [0, 2]]);

    expect(c.x).toBeCloseTo(5 / 6);
    expect(c.y).toBeCloseTo(5 / 6);
  });

  it("колінеарні → середнє вершин", () => {
    expect(polygonCentroid([[0, 0], [1, 1], [2, 2]])).toEqual({ x: 1, y: 1 });
  });
});

describe("fitBox", () => {
  it("широкий контейнер", () => {
    expect(fitBox({ width: 1000, height: 500 }, 1.5)).toEqual({ left: 125, top: 0, width: 750, height: 500 });
  });

  it("вузький контейнер", () => {
    expect(fitBox({ width: 300, height: 600 }, 1.5)).toEqual({ left: 0, top: 200, width: 300, height: 200 });
  });
});
