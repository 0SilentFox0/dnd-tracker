import { describe, expect, it } from "vitest";

import { cellCenter, cellPolygon, mapSize, tokenBox, UNIT } from "../layout";

import { GridShape } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";

const sq = GridShape.SQUARE;

const hex = GridShape.HEX;

describe("квадрати", () => {
  it("розмір карти й центр клітинки", () => {
    expect(mapSize({ grid: sq, cols: 20, rows: 12 })).toEqual({ width: 20 * UNIT, height: 12 * UNIT });
    expect(cellCenter(sq, { x: 2, y: 1 })).toEqual({ x: 2.5 * UNIT, y: 1.5 * UNIT });
    expect(cellPolygon(sq, { x: 0, y: 0 }).split(" ")).toHaveLength(4);
  });

  it("токен 2×2 — центр на стику чотирьох клітинок, діаметр ~2 клітинки", () => {
    const p = createMockParticipant();

    const big = { ...p, combatStats: { ...p.combatStats, gridSize: 2 }, battleData: { ...p.battleData, position: { x: 3, y: 3 } } };

    const box = tokenBox(sq, big);

    expect(box?.cx).toBe(4 * UNIT);
    expect(box?.cy).toBe(4 * UNIT);
    expect(box?.size).toBeGreaterThan(1.5 * UNIT);
  });

  it("учасник без позиції — без токена", () => {
    expect(tokenBox(sq, createMockParticipant())).toBeNull();
  });
});

describe("гекси (pointy-top, odd-r)", () => {
  it("непарний рядок зсунутий на пів ширини", () => {
    const even = cellCenter(hex, { x: 0, y: 0 });

    const odd = cellCenter(hex, { x: 0, y: 1 });

    expect(odd.x - even.x).toBeCloseTo((Math.sqrt(3) * UNIT) / 4, 5);
    expect(odd.y).toBeGreaterThan(even.y);
  });

  it("полігон має 6 вершин; карта вміщує зсунутий рядок", () => {
    expect(cellPolygon(hex, { x: 1, y: 1 }).split(" ")).toHaveLength(6);

    const { width } = mapSize({ grid: hex, cols: 4, rows: 2 });

    const last = cellCenter(hex, { x: 3, y: 1 });

    expect(width).toBeGreaterThanOrEqual(last.x + (Math.sqrt(3) * UNIT) / 4);
  });
});
