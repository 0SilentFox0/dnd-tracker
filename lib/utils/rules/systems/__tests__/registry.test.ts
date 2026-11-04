import { describe, expect, it } from "vitest";

import { RULE_SYSTEM_REGISTRY, ruleSystemOf, systemKeyOf } from "../registry";

import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";

const sheetInput = { characteristics: {} as never, resources: {} };

describe("rule system registry", () => {
  it("has the three systems", () => {
    expect(Object.keys(RULE_SYSTEM_REGISTRY).sort()).toEqual(["dnd5e", "homm", "wfrp"]);
  });

  it("resolves from rules", () => {
    expect(ruleSystemOf(DEFAULT_RULES).key).toBe("homm");
    expect(systemKeyOf({ system: { key: "wfrp" } })).toBe("wfrp");
  });

  it("d20 systems keep the existing behaviour", () => {
    for (const key of ["homm", "dnd5e"] as const) {
      const s = RULE_SYSTEM_REGISTRY[key];

      expect(s.progression.maxHp({} as never)).toBeNull();
      expect(s.characteristics.sheetBlock(sheetInput)).toBeUndefined();
      expect(s.sheetTest.accepts({ kind: "check" })).toBe(true);
      expect(s.sheetTest.accepts({ kind: "test" })).toBe(false);
      expect(s.battle.supported).toBe(true);
      expect(s.balance.kind).toBe("fair");
      expect(s.distance).toEqual({ unit: "ft", perCell: 5 });
      expect(s.progression.levels).toBe(true);
      expect(s.unusedMechanics).toEqual([]);
    }
  });

  it("wfrp accepts tests only and is not battle-ready", () => {
    const s = RULE_SYSTEM_REGISTRY.wfrp;

    expect(s.sheetTest.accepts({ kind: "test" })).toBe(true);
    expect(s.sheetTest.accepts({ kind: "check" })).toBe(false);
    expect(s.battle.supported).toBe(false);
    expect(s.balance.kind).toBe("none");
    expect(s.distance).toEqual({ unit: "yd", perCell: 2 });
    expect(s.progression.levels).toBe(false);
    expect(s.unusedMechanics).toContain("classes");
  });
});
