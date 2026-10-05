import { describe, expect, it } from "vitest";

import { planQuickStatUpdate } from "@/lib/utils/units/quick-stats";
import type { Unit } from "@/types/units";

const unit = { id: "u1", armorClass: 14, initiative: 2, attacks: [{ name: "Меч", damageDice: "1d8" }] } as unknown as Unit;

describe("planQuickStatUpdate", () => {
  it("resets on empty or non-numeric AC", () => {
    expect(planQuickStatUpdate("ac", " ", unit, 0)).toEqual({ kind: "reset" });
    expect(planQuickStatUpdate("ac", "abc", unit, 0)).toEqual({ kind: "reset" });
  });

  it("clamps negative AC to 0 and skips unchanged", () => {
    expect(planQuickStatUpdate("ac", "-3", unit, 0)).toEqual({ kind: "update", data: { armorClass: 0 } });
    expect(planQuickStatUpdate("ac", "14", unit, 0)).toEqual({ kind: "noop" });
  });

  it("updates initiative, allowing negatives", () => {
    expect(planQuickStatUpdate("init", "-1", unit, 0)).toEqual({ kind: "update", data: { initiative: -1 } });
  });

  it("dice: resets on empty, noop on same, replaces only the primary attack", () => {
    expect(planQuickStatUpdate("dice", "", unit, 0)).toEqual({ kind: "reset" });
    expect(planQuickStatUpdate("dice", " 1d8 ", unit, 0)).toEqual({ kind: "noop" });
    expect(planQuickStatUpdate("dice", "2d6", unit, 0)).toEqual({ kind: "update", data: { attacks: [{ name: "Меч", damageDice: "2d6" }] } });
  });

  it("dice without a primary attack is a noop", () => {
    expect(planQuickStatUpdate("dice", "2d6", unit, -1)).toEqual({ kind: "noop" });
  });
});
