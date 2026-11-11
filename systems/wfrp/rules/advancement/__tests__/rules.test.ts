import { describe, expect, it } from "vitest";

import { DEFAULT_ADVANCEMENT_RULES } from "../defaults";

import { DEFAULT_RULES } from "@/lib/utils/rules";
import { mergeRules, parseRules, RulesetPatchSchema, RulesetSchema } from "@/lib/utils/rules/schema";

describe("rules.advancement", () => {
  it("parse({}) carries default advancement", () => {
    expect(RulesetSchema.parse({}).advancement).toEqual(DEFAULT_ADVANCEMENT_RULES);
    expect(DEFAULT_RULES.advancement).toEqual(DEFAULT_ADVANCEMENT_RULES);
    expect(parseRules({}).advancement).toEqual(DEFAULT_ADVANCEMENT_RULES);
  });

  it("rejects unknown keys", () => {
    expect(RulesetSchema.safeParse({ advancement: { extra: 1 } }).success).toBe(false);
    expect(RulesetSchema.safeParse({ advancement: { characteristic: { extra: 1 } } }).success).toBe(false);
  });

  it("brackets must not decrease and max covers the last bracket", () => {
    const track = (brackets: { upTo: number; cost: number }[], max: number) => ({ advancement: { characteristic: { brackets, max } } });

    expect(RulesetSchema.safeParse(track([{ upTo: 5, cost: 30 }, { upTo: 10, cost: 20 }], 10)).success).toBe(false);
    expect(RulesetSchema.safeParse(track([{ upTo: 5, cost: 20 }, { upTo: 5, cost: 30 }], 10)).success).toBe(false);
    expect(RulesetSchema.safeParse(track([{ upTo: 5, cost: 20 }], 4)).success).toBe(false);
    expect(RulesetSchema.safeParse(track([{ upTo: 5, cost: 20 }, { upTo: 10, cost: 30 }], 10)).success).toBe(true);
  });

  it("patch merges the multiplier", () => {
    const patch = RulesetPatchSchema.parse({ advancement: { talentCostMultiplier: 2 } });

    const merged = mergeRules(DEFAULT_RULES, patch);

    expect(merged.ok && merged.rules.advancement.talentCostMultiplier).toBe(2);
  });

  it("default carries career rules; old rules without career parse with the default", () => {
    expect(DEFAULT_ADVANCEMENT_RULES.career).toEqual({ ticksRequired: [10, 12, 14], outOfCareerMultiplier: 2 });

    const { career: _career, ...old } = DEFAULT_ADVANCEMENT_RULES;

    expect(parseRules({ advancement: old }).advancement.career).toEqual(DEFAULT_ADVANCEMENT_RULES.career);
  });

  it("rejects bad career rules", () => {
    const career = (c: unknown) => RulesetSchema.safeParse({ advancement: { career: c } }).success;

    expect(career({ ticksRequired: [10, 12, 14], outOfCareerMultiplier: 0.5 })).toBe(false);
    expect(career({ ticksRequired: [10, 12], outOfCareerMultiplier: 2 })).toBe(false);
    expect(career({ ticksRequired: [10, 12, 14], outOfCareerMultiplier: 1 })).toBe(true);
  });
});
