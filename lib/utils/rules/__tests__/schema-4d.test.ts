import { describe, expect, it } from "vitest";

import { DEFAULT_RULES, MECHANIC_REGISTRY } from "@/lib/utils/rules";
import { mergeRules, parseRules, RulesetPatchSchema } from "@/lib/utils/rules/schema";

const OFF = { persistResources: false, longRestHitDice: "half", xp: false, inspiration: false };

describe("rules.outOfCombat", () => {
  it("defaults to everything off", () => {
    expect(DEFAULT_RULES.outOfCombat).toEqual(OFF);
    expect(parseRules({}).outOfCombat).toEqual(OFF);
  });

  it("falls back to default on an invalid section", () => {
    expect(parseRules({ outOfCombat: { longRestHitDice: "some" } }).outOfCombat).toEqual(OFF);
  });

  it("patches a single toggle", () => {
    const patch = RulesetPatchSchema.parse({ outOfCombat: { persistResources: true, longRestHitDice: "all" } });

    const merged = mergeRules(DEFAULT_RULES, patch);

    expect(merged.ok && merged.rules.outOfCombat).toEqual({ ...OFF, persistResources: true, longRestHitDice: "all" });
  });

  it("is a registered mechanic", () => {
    expect(MECHANIC_REGISTRY.outOfCombat.label).toBe("Поза боєм");
  });
});
