import { describe, expect, it } from "vitest";

import { mergeRules, parseRules, RulesetPatchSchema } from "@/lib/utils/rules/schema";

describe("rules 4a sections", () => {
  it("defaults keep 5e mechanics off", () => {
    const r = parseRules({});

    expect(r.saves).toEqual({ proficiency: false });
    expect(r.deathSaves).toEqual({ enabled: false, unitsDieAtZero: true });
    expect(r.concentration).toEqual({ enabled: false, dcCap: null });
    expect(r.conditions).toEqual({ enabled: false, exhaustion: "2014" });
  });

  it("invalid section falls back to defaults, others survive", () => {
    const r = parseRules({ conditions: { exhaustion: "1999" }, deathSaves: { enabled: true } });

    expect(r.conditions.exhaustion).toBe("2014");
    expect(r.deathSaves.enabled).toBe(true);
  });

  it("patch merges and validates dcCap", () => {
    const base = parseRules({});

    expect(RulesetPatchSchema.safeParse({ concentration: { dcCap: 30 } }).success).toBe(true);
    expect(RulesetPatchSchema.safeParse({ concentration: { dcCap: 5 } }).success).toBe(false);

    const merged = mergeRules(base, { concentration: { enabled: true, dcCap: 30 } });

    expect(merged.ok && merged.rules.concentration).toEqual({ enabled: true, dcCap: 30 });
  });
});
