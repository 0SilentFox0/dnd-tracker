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
      expect(s).toMatchObject({ lineage: true, attacks: true });
      expect(s.unusedMechanics).toEqual([]);
    }
  });

  it("wfrp accepts tests only and is battle-ready", () => {
    const s = RULE_SYSTEM_REGISTRY.wfrp;

    expect(s.sheetTest.accepts({ kind: "test" })).toBe(true);
    expect(s.sheetTest.accepts({ kind: "check" })).toBe(false);
    expect(s.battle.supported).toBe(true);
    expect(s.balance.kind).toBe("fair");
    expect(s.combat.hitModel).toBeDefined();
    expect(s.distance).toEqual({ unit: "yd", perCell: 2 });
    expect(s.progression.levels).toBe(false);
    expect(s).toMatchObject({ lineage: false, attacks: false });
    expect(s.unusedMechanics).toContain("classes");
  });

  it("creation exists only for wfrp", () => {
    expect(RULE_SYSTEM_REGISTRY.wfrp.creation).toBeDefined();
    expect(RULE_SYSTEM_REGISTRY.homm.creation).toBeUndefined();
    expect(RULE_SYSTEM_REGISTRY.dnd5e.creation).toBeUndefined();
  });

  it("conditions and fortune hooks exist only for wfrp", () => {
    expect(RULE_SYSTEM_REGISTRY.wfrp.conditions).toBeDefined();
    expect(RULE_SYSTEM_REGISTRY.wfrp.combat.fortune).toBe(true);

    for (const key of ["homm", "dnd5e"] as const) {
      expect(RULE_SYSTEM_REGISTRY[key].conditions).toBeUndefined();
      expect(RULE_SYSTEM_REGISTRY[key].combat.fortune).toBeUndefined();
    }

    const catalog = RULE_SYSTEM_REGISTRY.wfrp.conditions!.catalog;

    const by = (k: string) => catalog.find((c) => c.key === k);

    expect(catalog).toHaveLength(12);
    expect(by("prone")).toMatchObject({ endTest: "stand", maxLevel: null });
    expect(by("fatigued")?.endTest).toBeNull();
    expect(by("bleeding")?.maxLevel).toBe(10);
    expect(by("bleeding")?.endTest).toBe("roll");
  });
});
