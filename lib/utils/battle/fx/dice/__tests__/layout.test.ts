import { describe, expect, it } from "vitest";

import { layoutDice, MAX_DICE } from "@/lib/utils/battle/fx/dice";

const d = (sides: 4 | 6 | 8 | 10 | 12 | 20, value = 1) => ({ sides, value });

describe("layoutDice", () => {
  it("кожна група — свій ряд, у порядку груп", () => {
    const { slots, overflow } = layoutDice([[d(20, 15), d(20, 3)], [d(8, 4), d(6, 2)]]);

    expect(slots.map((s) => [s.row, s.col, s.rowLength])).toEqual([[0, 0, 2], [0, 1, 2], [1, 0, 2], [1, 1, 2]]);
    expect(overflow).toBe(0);
  });

  it("понад MAX_DICE — обрізає з кінця і рахує решту", () => {
    const { slots, overflow } = layoutDice([[d(20)], Array.from({ length: 14 }, () => d(6))]);

    expect(slots).toHaveLength(MAX_DICE);
    expect(overflow).toBe(3);
  });

  it("ряд довший за 6 переноситься", () => {
    const { slots } = layoutDice([Array.from({ length: 8 }, () => d(6))]);

    expect(Math.max(...slots.map((s) => s.row))).toBe(1);
    expect(slots.filter((s) => s.row === 0)).toHaveLength(6);
  });
});
