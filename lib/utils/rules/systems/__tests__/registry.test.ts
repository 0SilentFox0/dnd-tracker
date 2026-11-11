import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { RULE_SYSTEM_KEYS } from "../meta";
import { RULE_SYSTEM_REGISTRY, ruleSystemOf, systemKeyOf } from "../registry";

import { SYSTEM_UI } from "@/components/systems/registry";
import { SYSTEM_SERVER } from "@/lib/server/systems/registry";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";
import { must } from "@/systems/wfrp/rules/traits/__tests__/fixtures";

const sheetInput = { characteristics: {} as never, resources: {} };

describe("rule system registry", () => {
  it("has the three systems", () => {
    expect(Object.keys(RULE_SYSTEM_REGISTRY).sort()).toEqual(["dnd5e", "homm", "wfrp"]);
  });

  it("registries of logic, ui and server schemas cover the same keys", () => {
    const keys = [...RULE_SYSTEM_KEYS].sort();

    expect(Object.keys(RULE_SYSTEM_REGISTRY).sort()).toEqual(keys);
    expect(Object.keys(SYSTEM_UI).sort()).toEqual(keys);
    expect(Object.keys(SYSTEM_SERVER).sort()).toEqual(keys);
  });

  it("the contract file names no system and no function type of one", () => {
    const text = readFileSync(path.join(process.cwd(), "lib/utils/rules/systems/types.ts"), "utf8");

    expect(text).not.toContain("@/systems/");
    expect(text).not.toMatch(/typeof (plan|roll|armour|encumbrance|wfrp|advance|validate|QUALITY)/);
  });

  it("only wfrp drops alignments from the identity", () => {
    expect(RULE_SYSTEM_REGISTRY.wfrp.identity.alignments).toBe(false);
    expect(RULE_SYSTEM_REGISTRY.homm.identity.alignments).toBe(true);
    expect(RULE_SYSTEM_REGISTRY.dnd5e.identity.alignments).toBe(true);
  });

  it("only wfrp defines equipment", () => {
    expect(RULE_SYSTEM_REGISTRY.wfrp.equipment).toBeDefined();
    expect(RULE_SYSTEM_REGISTRY.homm.equipment).toBeUndefined();
    expect(RULE_SYSTEM_REGISTRY.dnd5e.equipment).toBeUndefined();
  });

  it("only wfrp defines traits", () => {
    expect(RULE_SYSTEM_REGISTRY.wfrp.traits).toBeDefined();
    expect(RULE_SYSTEM_REGISTRY.homm.traits).toBeUndefined();
    expect(RULE_SYSTEM_REGISTRY.dnd5e.traits).toBeUndefined();
  });

  it("only wfrp defines downtime", () => {
    expect(RULE_SYSTEM_REGISTRY.wfrp.downtime).toBe(true);
    expect(RULE_SYSTEM_REGISTRY.homm.downtime).toBeUndefined();
    expect(RULE_SYSTEM_REGISTRY.dnd5e.downtime).toBeUndefined();
  });

  it("only wfrp defines corruption", () => {
    expect(RULE_SYSTEM_REGISTRY.wfrp.corruption).toBe(true);
    expect(RULE_SYSTEM_REGISTRY.homm.corruption).toBeUndefined();
    expect(RULE_SYSTEM_REGISTRY.dnd5e.corruption).toBeUndefined();
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

    const catalog = must(RULE_SYSTEM_REGISTRY.wfrp.conditions).catalog;

    const by = (k: string) => catalog.find((c) => c.key === k);

    expect(catalog).toHaveLength(12);
    expect(by("prone")).toMatchObject({ endTest: "stand", maxLevel: null });
    expect(by("fatigued")?.endTest).toBeNull();
    expect(by("bleeding")?.maxLevel).toBe(10);
    expect(by("bleeding")?.endTest).toBe("roll");
  });

  it("inventory tab is on for every system; items (5e magic items) only for d20 systems", () => {
    for (const key of ["homm", "dnd5e", "wfrp"] as const) expect(RULE_SYSTEM_REGISTRY[key].inventory).toBe(true);

    expect(RULE_SYSTEM_REGISTRY.wfrp.items).toBe(false);
    expect(RULE_SYSTEM_REGISTRY.dnd5e.items).toBe(true);
  });
});
