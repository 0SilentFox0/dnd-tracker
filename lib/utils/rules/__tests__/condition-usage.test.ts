import { describe, expect, it } from "vitest";

import { isConditionUsed } from "../condition-usage";

import type { ConditionUsage } from "@/types/campaigns";

const EMPTY: ConditionUsage = { battles: [], spells: [], units: [], skills: [], artifacts: [], artifactSets: [], races: [], feats: [], statusEffects: [] };

describe("isConditionUsed", () => {
  it("is false when every list is empty", () => expect(isConditionUsed(EMPTY)).toBe(false));

  it.each(Object.keys(EMPTY) as (keyof ConditionUsage)[])("is true when only %s is non-empty", (key) => {
    const usage = { ...EMPTY, [key]: [{ id: "x", name: "X", status: "active", participants: [] }] };

    expect(isConditionUsed(usage)).toBe(true);
  });
});
