import { describe, expect, it } from "vitest";

import { calculatePercentBonus } from "../common/modifiers";

describe("calculatePercentBonus", () => {
  it("returns 0 when percentBonus is 0", () => {
    expect(calculatePercentBonus(100, 0)).toBe(0);
  });

  it("returns 0 when percentBonus is negative", () => {
    expect(calculatePercentBonus(100, -10)).toBe(0);
  });

  it("returns floor of baseValue * percent / 100 for positive percent", () => {
    expect(calculatePercentBonus(100, 25)).toBe(25);
    expect(calculatePercentBonus(40, 30)).toBe(12);
  });

  it("rounds down (floor)", () => {
    expect(calculatePercentBonus(100, 33)).toBe(33);
    expect(calculatePercentBonus(10, 15)).toBe(1);
  });
});
