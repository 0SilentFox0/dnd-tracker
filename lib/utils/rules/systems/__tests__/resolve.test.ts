import { afterEach, describe, expect, it } from "vitest";

import { defineAddon } from "../compose";
import { MODULES, ruleSystemOf } from "../registry";
import type { RuleSystemDefinition } from "../types";

const sel = (modules?: string[]) => ({ system: { key: "dnd5e", modules } });

describe("ruleSystemOf composition", () => {
  afterEach(() => {
    delete MODULES["t-a"];
    delete MODULES["t-b"];
  });

  it("preset keys resolve to the plain base definition", () => {
    expect(ruleSystemOf({ system: { key: "wfrp" } })).toBe(MODULES.wfrp);
    expect(ruleSystemOf(sel()).key).toBe("dnd5e");
  });

  it("different module sets do not share a cache entry", () => {
    MODULES["t-a"] = defineAddon<RuleSystemDefinition>(() => ({ downtime: true }));
    MODULES["t-b"] = defineAddon<RuleSystemDefinition>(() => ({ corruption: true }));

    const a = ruleSystemOf(sel(["t-a"]));

    const b = ruleSystemOf(sel(["t-b"]));

    const plain = ruleSystemOf(sel());

    expect([a.downtime, a.corruption]).toEqual([true, undefined]);
    expect([b.downtime, b.corruption]).toEqual([undefined, true]);
    expect([plain.downtime, plain.corruption]).toEqual([undefined, undefined]);
    expect(ruleSystemOf(sel(["t-a"]))).toBe(a);
  });

  it("an unknown module id throws", () => {
    expect(() => ruleSystemOf(sel(["nope"]))).toThrow(/nope/);
  });
});
