import { describe, expect, it } from "vitest";

import { revealSchedule } from "@/lib/utils/characters/generate";

describe("revealSchedule", () => {
  it("starts at first and grows by step", () => {
    expect(revealSchedule(3)).toEqual([500, 680, 860]);
  });

  it("accepts custom timings", () => {
    expect(revealSchedule(2, { first: 100, step: 50 })).toEqual([100, 150]);
  });

  it("is empty for zero steps", () => {
    expect(revealSchedule(0)).toEqual([]);
  });

  it("covers a full 13-step roll in about 2.7 s", () => {
    expect(revealSchedule(13).at(-1)).toBe(2660);
  });
});
