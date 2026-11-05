import { describe, expect, it } from "vitest";

import { SYSTEM_UI, systemUiOf } from "../registry";

import { RULE_SYSTEM_REGISTRY } from "@/lib/utils/rules/systems";

describe("system ui registry", () => {
  it("has the three systems, homm and dnd5e share the d20 ui", () => {
    expect(Object.keys(SYSTEM_UI).sort()).toEqual(["dnd5e", "homm", "wfrp"]);
    expect(systemUiOf("homm")).toBe(systemUiOf("dnd5e"));
    expect(systemUiOf("wfrp")).not.toBe(systemUiOf("homm"));
  });

  it("wfrp hides progression, d20 does not", () => {
    expect(systemUiOf("wfrp").hideProgression).toBe(true);
    expect(systemUiOf("homm").hideProgression).toBe(false);
  });

  it("sheet flags: d20 keeps spells/items/rest kinds/d20 stats, wfrp keeps only spells", () => {
    for (const key of ["homm", "dnd5e"] as const) {
      const sys = RULE_SYSTEM_REGISTRY[key];

      expect([sys.spells, sys.items, sys.d20Stats, sys.rest.kinds]).toEqual([true, true, true, true]);
    }

    const wfrp = RULE_SYSTEM_REGISTRY.wfrp;

    expect([wfrp.spells, wfrp.items, wfrp.d20Stats, wfrp.rest.kinds]).toEqual([true, false, false, false]);
  });
});
