import { describe, expect, it } from "vitest";

import { clamp01, closePolygon, coversPoint, distToSegment, fitBox, isRevealed, pointInPolygon, polygonCentroid, toMapPoint, zoneTouchesReveal } from "../geometry";

import type { Polygon, RevealShape } from "@/types/world";

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

describe("distToSegment", () => {
  it("degenerate segment is a point distance", () => {
    expect(distToSegment({ x: 0.5, y: 0.5 }, { x: 0.2, y: 0.5 }, { x: 0.2, y: 0.5 }, 1)).toBeCloseTo(0.3);
  });

  it("projects onto the segment and clamps at the ends", () => {
    expect(distToSegment({ x: 0.5, y: 0.6 }, { x: 0.2, y: 0.5 }, { x: 0.8, y: 0.5 }, 1)).toBeCloseTo(0.1);
    expect(distToSegment({ x: 0.9, y: 0.5 }, { x: 0.2, y: 0.5 }, { x: 0.8, y: 0.5 }, 1)).toBeCloseTo(0.1);
  });

  it("normalises vertical distance by aspect", () => {
    expect(distToSegment({ x: 0.5, y: 0.6 }, { x: 0.5, y: 0.3 }, { x: 0.5, y: 0.3 }, 3)).toBeCloseTo(0.1);
  });
});

describe("isRevealed / coversPoint", () => {
  const p: RevealShape = { t: "p", x: 0.5, y: 0.5 };

  it("boundary d == radius is revealed", () => {
    expect(isRevealed({ x: 0.6, y: 0.5 }, [p], 0.1, 1)).toBe(true);
    expect(isRevealed({ x: 0.61, y: 0.5 }, [p], 0.1, 1)).toBe(false);
  });

  it("aspect 3: radius is round in pixels", () => {
    expect(isRevealed({ x: 0.5, y: 0.5 + 0.3 * 0.9 }, [p], 0.1, 3)).toBe(true);
    expect(isRevealed({ x: 0.5, y: 0.5 + 0.3 * 1.1 }, [p], 0.1, 3)).toBe(false);
    expect(isRevealed({ x: 0.5 + 0.09, y: 0.5 }, [p], 0.1, 3)).toBe(true);
  });

  it("segment covers the capsule around it; empty shapes reveal nothing", () => {
    const s: RevealShape = { t: "s", x1: 0.2, y1: 0.5, x2: 0.8, y2: 0.5 };

    expect(isRevealed({ x: 0.5, y: 0.55 }, [s], 0.1, 1)).toBe(true);
    expect(coversPoint([s], { x: 0.5, y: 0.7 }, 0.1, 1)).toBe(false);
    expect(isRevealed({ x: 0.5, y: 0.5 }, [], 0.1, 1)).toBe(false);
  });
});

describe("pointInPolygon", () => {
  const sq: Polygon = [
    [0.2, 0.2],
    [0.6, 0.2],
    [0.6, 0.6],
    [0.2, 0.6],
  ];

  it("inside and outside", () => {
    expect(pointInPolygon({ x: 0.4, y: 0.4 }, sq)).toBe(true);
    expect(pointInPolygon({ x: 0.7, y: 0.4 }, sq)).toBe(false);
  });
});

describe("zoneTouchesReveal", () => {
  const sq: Polygon = [
    [0.4, 0.4],
    [0.6, 0.4],
    [0.6, 0.6],
    [0.4, 0.6],
  ];

  const pt = (x: number, y: number): RevealShape => ({ t: "p", x, y });

  it("no shapes → false", () => {
    expect(zoneTouchesReveal(sq, [], 0.1, 1)).toBe(false);
  });

  it("point inside the polygon", () => {
    expect(zoneTouchesReveal(sq, [pt(0.5, 0.5)], 0.01, 1)).toBe(true);
  });

  it("circle on an edge, and edge distance exactly radius", () => {
    expect(zoneTouchesReveal(sq, [pt(0.7, 0.5)], 0.1, 1)).toBe(true);
    expect(zoneTouchesReveal(sq, [pt(0.75, 0.5)], 0.1, 1)).toBe(false);
  });

  it("polygon fully inside the circle", () => {
    expect(zoneTouchesReveal(sq, [pt(0.5, 0.5)], 0.5, 1)).toBe(true);
    expect(zoneTouchesReveal(sq, [pt(0.3, 0.3)], 0.5, 1)).toBe(true);
  });

  it("segment end inside the polygon", () => {
    expect(zoneTouchesReveal(sq, [{ t: "s", x1: 0.9, y1: 0.9, x2: 0.5, y2: 0.5 }], 0.001, 1)).toBe(true);
  });

  it("segment crossing straight through without touching vertices", () => {
    expect(zoneTouchesReveal(sq, [{ t: "s", x1: 0.1, y1: 0.5, x2: 0.9, y2: 0.5 }], 0.001, 1)).toBe(true);
    expect(zoneTouchesReveal(sq, [{ t: "s", x1: 0.1, y1: 0.9, x2: 0.9, y2: 0.9 }], 0.001, 1)).toBe(false);
  });

  it("segment passing near but not touching, within radius", () => {
    expect(zoneTouchesReveal(sq, [{ t: "s", x1: 0.1, y1: 0.7, x2: 0.9, y2: 0.7 }], 0.1, 1)).toBe(true);
  });

  it("aspect 3 shrinks the vertical reach", () => {
    expect(zoneTouchesReveal(sq, [pt(0.5, 0.6 + 0.3 * 0.9)], 0.1, 3)).toBe(true);
    expect(zoneTouchesReveal(sq, [pt(0.5, 0.6 + 0.3 * 1.1)], 0.1, 3)).toBe(false);
  });
});
