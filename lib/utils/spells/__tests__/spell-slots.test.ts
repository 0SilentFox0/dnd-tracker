import { describe, expect, it } from "vitest";

import {
  calculateCharacterSpellSlots,
  calculateSpellSlotsForLevel,
} from "../spell-slots";

import type { SpellSlotProgression } from "@/types/races";

describe("calculateCharacterSpellSlots", () => {
  it("рівень 1: завжди тільки 2 слоти 1 рівня (без слотів 2–5)", () => {
    const r = calculateCharacterSpellSlots(1);
    expect(r["1"].max).toBe(2);
    expect(r["1"].current).toBe(0);
    expect(Object.keys(r)).toEqual(["1"]);
  });

  it("рівень 2: +1 регулярний слот", () => {
    const r = calculateCharacterSpellSlots(2);
    expect(r["1"].max).toBe(3); // 2 + 1
  });

  it("рівень 5: слот високого рівня (4)", () => {
    const r = calculateCharacterSpellSlots(5);
    expect(r["4"].max).toBe(1);
    expect(r["1"].max).toBeGreaterThanOrEqual(2);
  });

  it("рівень 10: слот рівня 5", () => {
    const r = calculateCharacterSpellSlots(10);
    expect(r["5"].max).toBe(1);
  });

  it("повертає порожній об'єкт для рівня 0", () => {
    const r = calculateCharacterSpellSlots(0);
    expect(Object.keys(r).length).toBe(0);
  });
});

describe("calculateSpellSlotsForLevel", () => {
  it("повертає порожні слоти для рівня 0 при наявній програмації", () => {
    const progression: SpellSlotProgression[] = [
      { level: 1, slots: 2 },
      { level: 2, slots: 1 },
    ];

    const result = calculateSpellSlotsForLevel(0, 20, progression);

    expect(result["1"].max).toBe(0);
    expect(result["2"].max).toBe(0);
  });

  it("при порожній програмації використовує character slots", () => {
    const result = calculateSpellSlotsForLevel(5, 20, []);

    expect(result["1"].max).toBeGreaterThanOrEqual(2);
    expect(result["4"].max).toBe(1);
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
