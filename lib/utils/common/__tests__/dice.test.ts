import { describe, expect, it } from "vitest";

import { averageRoll, maxRoll, parseDice, validateDiceRolls } from "@/lib/utils/common/dice";

describe("parseDice", () => {
  it("2d6+3", () => {
    expect(parseDice("2d6+3")).toEqual({ groups: [{ count: 2, size: 6 }], flat: 3 });
  });

  it("кілька груп і мінус: 1d8 + 1d6 - 1", () => {
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

  it("великі літери і пробіли", () => {
    expect(parseDice(" 3D4 ")).toEqual({ groups: [{ count: 3, size: 4 }], flat: 0 });
  });

  it("невалідне — null", () => {
    expect(parseDice("abc")).toBeNull();
    expect(parseDice("")).toBeNull();
    expect(parseDice("2d0")).toBeNull();
    expect(parseDice("0d6")).toBeNull();
  });
});

describe("validateDiceRolls", () => {
  it("коректні кидки", () => {
    expect(validateDiceRolls("2d6+3", [1, 6])).toEqual({ ok: true });
  });

  it("не та кількість", () => {
    expect(validateDiceRolls("2d6", [4])).toEqual({ ok: false, reason: "count_mismatch" });
    expect(validateDiceRolls("2d6", [4, 4, 4])).toEqual({ ok: false, reason: "count_mismatch" });
  });

  it("поза межами кубика: 0, 7 на d6, від'ємне, дробове", () => {
    expect(validateDiceRolls("1d6", [0])).toEqual({ ok: false, reason: "out_of_range" });
    expect(validateDiceRolls("1d6", [7])).toEqual({ ok: false, reason: "out_of_range" });
    expect(validateDiceRolls("1d6", [-3])).toEqual({ ok: false, reason: "out_of_range" });
    expect(validateDiceRolls("1d6", [2.5])).toEqual({ ok: false, reason: "out_of_range" });
  });

  it("кидки перевіряються по групах у порядку формули", () => {
    expect(validateDiceRolls("1d4+1d12", [3, 11])).toEqual({ ok: true });
    expect(validateDiceRolls("1d4+1d12", [11, 3])).toEqual({ ok: false, reason: "out_of_range" });
  });

  it("крит подвоює кількість кубиків", () => {
    expect(validateDiceRolls("1d8+2", [3, 8], { critical: true })).toEqual({ ok: true });
    expect(validateDiceRolls("1d8+2", [3], { critical: true })).toEqual({ ok: false, reason: "count_mismatch" });
  });

  it("невалідна формула", () => {
    expect(validateDiceRolls("xyz", [1])).toEqual({ ok: false, reason: "invalid_formula" });
  });
});

describe("maxRoll / averageRoll", () => {
  it("максимум 2d6+3 = 15", () => {
    expect(maxRoll("2d6+3")).toBe(15);
  });

  it("середнє 1d6 = 3.5 (без округлення)", () => {
    expect(averageRoll("1d6")).toBe(3.5);
    expect(averageRoll("2d6+3")).toBe(10);
  });

  it("невалідна формула — 0", () => {
    expect(maxRoll("x")).toBe(0);
    expect(averageRoll("x")).toBe(0);
  });
});
