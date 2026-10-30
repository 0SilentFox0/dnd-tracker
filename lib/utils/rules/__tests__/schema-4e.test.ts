import { describe, expect, it } from "vitest";

import { DEFAULT_RULES, MECHANIC_REGISTRY } from "@/lib/utils/rules";
import { mergeRules, parseRules, RulesetPatchSchema } from "@/lib/utils/rules/schema";

const OFF = { balance: "fair", edition: "2014", autoXp: false };

describe("rules.encounters", () => {
  it("defaults to HOMM fair balance without auto XP", () => {
    expect(DEFAULT_RULES.encounters).toEqual(OFF);
    expect(parseRules({}).encounters).toEqual(OFF);
  });

  it("falls back to default on an invalid section", () => {
    expect(parseRules({ encounters: { balance: "cr" } }).encounters).toEqual(OFF);
  });

  it("patches one field", () => {
    const patch = RulesetPatchSchema.parse({ encounters: { balance: "xp", edition: "2024" } });

    const merged = mergeRules(DEFAULT_RULES, patch);

    expect(merged.ok && merged.rules.encounters).toEqual({ ...OFF, balance: "xp", edition: "2024" });
  });

  it("is a registered mechanic", () => {
    expect(MECHANIC_REGISTRY.encounters).toBe(true);
  });
});
