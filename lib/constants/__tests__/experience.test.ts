import { describe, expect, it } from "vitest";

import { addExperience, levelUpAvailable, xpForLevel, xpShare } from "@/lib/constants/experience";

describe("experience", () => {
  it("5e thresholds", () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(300);
    expect(xpForLevel(5)).toBe(6500);
    expect(xpForLevel(20)).toBe(355000);
    expect(xpForLevel(21)).toBeNull();
  });

  it("levelUpAvailable respects threshold and campaign max level", () => {
    expect(levelUpAvailable({ level: 1, experience: 300 }, 20)).toBe(true);
    expect(levelUpAvailable({ level: 1, experience: 299 }, 20)).toBe(false);
    expect(levelUpAvailable({ level: 5, experience: 999999 }, 5)).toBe(false);
    expect(levelUpAvailable({ level: 20, experience: 999999 }, 30)).toBe(false);
  });

  it("xpShare splits evenly, rounding toward zero", () => {
    expect(xpShare(1000, 3, true)).toBe(333);
    expect(xpShare(-100, 3, true)).toBe(-33);
    expect(xpShare(1000, 3, false)).toBe(1000);
  });

  it("addExperience never goes below 0", () => {
    expect(addExperience(50, -100)).toBe(0);
    expect(addExperience(50, 25)).toBe(75);
  });
});
