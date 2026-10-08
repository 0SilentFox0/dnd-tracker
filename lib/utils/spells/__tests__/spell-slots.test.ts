import { describe, expect, it } from "vitest";

import {
  calculateCharacterSpellSlots,
  calculateSpellSlotsForLevel,
} from "../spell-slots";

import { RACES } from "@/data/library/races";
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

describe("бібліотечна програмація рас 4/3/3/2/1", () => {
  const slotsAt = (level: number) =>
    Object.fromEntries(Object.entries(calculateSpellSlotsForLevel(level, 20, RACES[0].spellSlotProgression)).map(([k, v]) => [k, v.max]));

  it("кожна раса бібліотеки має однакову програмацію", () => {
    for (const race of RACES) expect(race.spellSlotProgression).toEqual(RACES[0].spellSlotProgression);
  });

  it.each([
    [1, { "1": 2, "2": 0, "3": 0, "4": 0, "5": 0 }],
    [5, { "1": 4, "2": 3, "3": 2, "4": 0, "5": 0 }],
    [9, { "1": 4, "2": 3, "3": 3, "4": 2, "5": 1 }],
    [13, { "1": 4, "2": 3, "3": 3, "4": 2, "5": 1 }],
    [17, { "1": 4, "2": 3, "3": 3, "4": 2, "5": 1 }],
  ])("герой рівня %i", (level, expected) => {
    expect(slotsAt(level)).toEqual(expected);
  });
});
