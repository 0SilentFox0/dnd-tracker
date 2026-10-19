import { describe, expect, it } from "vitest";

import { backgroundBox, backgroundColsOf, gridForCellSize, impliedCellPx, MAX_SIDE, MIN_SIDE } from "@/lib/utils/battle/grid";

const tomb = { width: 1980, height: 1200 };

describe("розмір клітинки фону", () => {
  it("cols/rows — округлена кількість клітинок фону; ширина фону в клітинках без округлення", () => {
    expect(gridForCellSize(tomb, 99)).toEqual({ cols: 20, rows: 12, backgroundCols: 20 });
    expect(gridForCellSize({ width: 1000, height: 600 }, 64)).toEqual({ cols: 16, rows: 9, backgroundCols: 15.625 });
  });

  it("обмеження MIN_SIDE..MAX_SIDE", () => {
    expect(gridForCellSize({ width: 100, height: 100 }, 200)).toMatchObject({ cols: MIN_SIDE, rows: MIN_SIDE });
    expect(gridForCellSize({ width: 9000, height: 9000 }, 24)).toMatchObject({ cols: MAX_SIDE, rows: MAX_SIDE });
    expect(MAX_SIDE).toBe(60);
  });

  it("без збереженого масштабу фон вписується в cols×rows; клітинка — з нього", () => {
    expect(backgroundColsOf({ cols: 20, rows: 12 }, tomb)).toBeCloseTo(19.8);
    expect(impliedCellPx({ cols: 20, rows: 12 }, tomb)).toBe(100);
    expect(impliedCellPx({ cols: 16, rows: 9, backgroundCols: 15.625 }, { width: 1000, height: 600 })).toBe(64);
  });

  it("рамка фону: зсув у частках клітинки; масштаб — лише коли відомі пропорції", () => {
    expect(backgroundBox({ cols: 20, rows: 12 }, 10, null)).toEqual({ left: 0, top: 0, width: 200, height: 120 });
    expect(backgroundBox({ cols: 20, rows: 12, gridOffset: { x: 0.5, y: 0.25 } }, 40, 0.6)).toEqual({ left: -20, top: -10, width: 800, height: 480 });
    expect(backgroundBox({ cols: 16, rows: 9, backgroundCols: 15.625 }, 10, 0.6)).toEqual({ left: 0, top: 0, width: 156.25, height: 93.75 });
  });
});
