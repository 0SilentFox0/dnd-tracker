import { describe, expect, it } from "vitest";

import { mergeRules, parseRules } from "@/lib/utils/rules/schema";

describe("rules actions section", () => {
  it("defaults off", () => {
    expect(parseRules({}).actions).toEqual({ enabled: false, opportunityAttacks: true, variant: "2014" });
  });

  it("invalid variant falls back", () => {
    expect(parseRules({ actions: { variant: "1999" } }).actions.variant).toBe("2014");
  });

  it("patch merges", () => {
    const r = mergeRules(parseRules({}), { actions: { enabled: true, variant: "2024" } });

    expect(r.ok && r.rules.actions).toEqual({ enabled: true, opportunityAttacks: true, variant: "2024" });
  });
});
