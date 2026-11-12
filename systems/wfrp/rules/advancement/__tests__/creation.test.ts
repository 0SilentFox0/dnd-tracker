import { describe, expect, it } from "vitest";

import { DEFAULT_RULES } from "@/lib/utils/rules";
import { parseRules } from "@/lib/utils/rules/schema";
import { DEFAULT_ADVANCEMENT_RULES } from "@/systems/wfrp/rules/advancement/rules";
import { AdvancementRulesSchema } from "@/systems/wfrp/rules/advancement/schema";

const { creation: _creation, ...withoutCreation } = DEFAULT_ADVANCEMENT_RULES;

describe("advancement.creation", () => {
  it("has the stub defaults", () => {
    expect(DEFAULT_ADVANCEMENT_RULES.creation).toEqual({ careerBonus: { rolled: 50, choice: 25, free: 0 }, statBonus: { rolled: 50, rearranged: 25, free: 0 }, freeBudget: 100 });
  });

  it("fills creation when the stored advancement lacks it and keeps other values", () => {
    const rules = parseRules({ advancement: { ...withoutCreation, talentCostMultiplier: 3 } });

    expect(rules.advancement.talentCostMultiplier).toBe(3);
    expect(rules.advancement.creation).toEqual(DEFAULT_RULES.advancement.creation);
  });

  it("rejects a free budget nobody can reach (outside 40..180)", () => {
    const parse = (freeBudget: number) => AdvancementRulesSchema.safeParse({ ...DEFAULT_ADVANCEMENT_RULES, creation: { freeBudget } }).success;

    expect([parse(40), parse(180), parse(39), parse(181), parse(0)]).toEqual([true, true, false, false, false]);
  });

  it("keeps a partial creation and defaults the rest", () => {
    const rules = parseRules({ advancement: { ...DEFAULT_ADVANCEMENT_RULES, creation: { freeBudget: 90 } } });

    expect(rules.advancement.creation).toEqual({ ...DEFAULT_ADVANCEMENT_RULES.creation, freeBudget: 90 });
  });

  it("rejects out-of-range values and falls back per section", () => {
    const bad = parseRules({ advancement: { ...DEFAULT_ADVANCEMENT_RULES, creation: { careerBonus: { rolled: -1 } } } });

    expect(bad.advancement).toEqual(DEFAULT_ADVANCEMENT_RULES);

    const high = parseRules({ advancement: { ...DEFAULT_ADVANCEMENT_RULES, creation: { freeBudget: 1001 } } });

    expect(high.advancement).toEqual(DEFAULT_ADVANCEMENT_RULES);
  });

  it("accepts the bounds", () => {
    const rules = parseRules({ advancement: { ...DEFAULT_ADVANCEMENT_RULES, creation: { freeBudget: 40, statBonus: { rolled: 1000 } } } });

    expect(rules.advancement.creation.freeBudget).toBe(40);
    expect(rules.advancement.creation.statBonus.rolled).toBe(1000);
  });
});
