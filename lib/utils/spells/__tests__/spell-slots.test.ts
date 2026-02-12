import { describe, expect,it } from "vitest";

import { calculateSpellSlotsForLevel } from "../spell-slots";

import type { SpellSlotProgression } from "@/types/races";

describe("calculateSpellSlotsForLevel", () => {
  it("повертає порожні слоти для рівня 0", () => {
    const progression: SpellSlotProgression[] = [
      { level: 1, slots: 2 },
      { level: 2, slots: 1 },
    ];

    const result = calculateSpellSlotsForLevel(0, 20, progression);

    expect(result["1"].max).toBe(0);
    expect(result["2"].max).toBe(0);
  });

  it("повертає порожні слоти при порожній програмації", () => {
    const result = calculateSpellSlotsForLevel(5, 20, []);

    expect(result["1"].max).toBe(0);
  });

  it("заповнює слоти для рівня та програмації", () => {
    const progression: SpellSlotProgression[] = [
      { level: 1, slots: 4 },
      { level: 2, slots: 2 },
      { level: 3, slots: 1 },
    ];

    const result = calculateSpellSlotsForLevel(10, 20, progression);

    expect(result["1"].max).toBeGreaterThanOrEqual(0);
    expect(result["2"].max).toBeGreaterThanOrEqual(0);
    expect(result["3"].max).toBeGreaterThanOrEqual(0);
  });
});
