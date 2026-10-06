import { describe, expect, it } from "vitest";

import {
  getDiceAverage,
  getDiceSlots,
  getTotalDiceCount,
  mergeDiceFormulas as mergeLegacy,
} from "@/lib/utils/battle/balance/dice";
import {
  diceAverage,
  diceCount,
  diceMax,
  diceSlots,
  leadingDice,
  mergeDiceFormulas,
  parseDice,
  rollDice,
  rollDiceList,
} from "@/lib/utils/common/dice";

const seq = (...values: number[]) => {
  let i = 0;

  return () => values[i++ % values.length];
};

describe("parseDice", () => {
  it("розбирає кубики й модифікатор", () => {
    expect(parseDice("2d6+3")).toEqual({ groups: [{ count: 2, size: 6 }], flat: 3 });
  });

  it("кілька груп і від'ємний модифікатор", () => {
    expect(parseDice("1d8 + 1d6 - 1")).toEqual({
      groups: [
        { count: 1, size: 8 },
        { count: 1, size: 6 },
      ],
      flat: -1,
    });
  });

  it("d20 без кількості — один кубик", () => {
    expect(parseDice("d20")).toEqual({ groups: [{ count: 1, size: 20 }], flat: 0 });
  });

  it("лише число", () => {
    expect(parseDice("5")).toEqual({ groups: [], flat: 5 });
  });

  it("регістр і пробіли", () => {
    expect(parseDice(" 3D4 ")).toEqual({ groups: [{ count: 3, size: 4 }], flat: 0 });
  });

  it("невалідне → null", () => {
    expect(parseDice("abc")).toBeNull();
    expect(parseDice("")).toBeNull();
    expect(parseDice("2d0")).toBeNull();
    expect(parseDice("0d6")).toBeNull();
  });
});

describe("diceAverage / diceMax", () => {
  it.each([
    ["2d6+3", 10, 15],
    ["1d8+1d6", 8, 14],
    ["1d6-1", 2.5, 5],
    ["d20", 10.5, 20],
    ["5", 5, 5],
  ] as const)("%s → %d / %d", (formula, avg, max) => {
    expect(diceAverage(formula)).toBe(avg);
    expect(diceMax(formula)).toBe(max);
  });

  it("невалідне → 0", () => {
    expect(diceAverage("x")).toBe(0);
    expect(diceAverage("")).toBe(0);
    expect(diceMax("2d6+MOD")).toBe(0);
  });
});

describe("diceCount / diceSlots / mergeDiceFormulas", () => {
  it("рахує кубики", () => {
    expect(diceCount("1d8+1d6+2")).toBe(2);
    expect(diceCount("3d6")).toBe(3);
    expect(diceCount("1d8 piercing")).toBe(0);
  });

  it("слоти — за зростанням граней", () => {
    expect(diceSlots("1d8+2d6")).toEqual([6, 6, 8]);
    expect(diceSlots("")).toEqual([]);
  });

  it("об'єднує формули без плаского модифікатора", () => {
    expect(mergeDiceFormulas("1d8+2", "1d6")).toBe("1d6+1d8");
    expect(mergeDiceFormulas("2d6", "3d8+1d6")).toBe("3d6+3d8");
    expect(mergeDiceFormulas("", "")).toBe("");
  });
});

describe("leadingDice", () => {
  it("перша група на початку тексту", () => {
    expect(leadingDice("2d8 + MOD")).toEqual({ count: 2, size: 8 });
    expect(leadingDice("d6")).toEqual({ count: 1, size: 6 });
    expect(leadingDice("D10")).toEqual({ count: 1, size: 10 });
    expect(leadingDice("fire 2d6")).toBeNull();
    expect(leadingDice("d0")).toBeNull();
  });
});

describe("rollDice / rollDiceList", () => {
  it("кидає кожен кубик через rng", () => {
    expect(rollDiceList("2d6+1", seq(0, 0.99))).toEqual([1, 6]);
    expect(rollDice("2d6+1", seq(0, 0.99))).toBe(8);
  });

  it("не менше нуля", () => {
    expect(rollDice("1d4-5", seq(0))).toBe(0);
  });

  it("невалідне → 0 / []", () => {
    expect(rollDice("x", seq(0.5))).toBe(0);
    expect(rollDiceList("x")).toEqual([]);
  });
});

describe("паритет зі старим balance/dice на чистих формулах", () => {
  it.each(["2d6+3", "1d8+1d6", "1d6-1", "3d8+1d4", "1d4+1d6", "2d6 + 3", "", "abc"])("%s", (formula) => {
    expect(diceAverage(formula)).toBe(getDiceAverage(formula));
    expect(diceCount(formula)).toBe(getTotalDiceCount(formula));
    expect(mergeDiceFormulas(formula, "1d6")).toBe(mergeLegacy(formula, "1d6"));
  });

  it.each(["2d6+3", "1d8+1d6", "1d6-1", "3d8+1d4", "2d6 + 3"])("слоти %s", (formula) => {
    expect(diceSlots(formula)).toEqual(getDiceSlots(formula));
  });
});
