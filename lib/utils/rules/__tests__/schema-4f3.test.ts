import { describe, expect, it } from "vitest";

import { DEFAULT_RULES, MECHANIC_REGISTRY } from "@/lib/utils/rules";
import { mergeRules, parseRules, RulesetPatchSchema } from "@/lib/utils/rules/schema";
import { SRD_RULES } from "@/scripts/srd/lib/rules-preset";

const OFF = { enabled: false, attunementLimit: 3 };

describe("rules.items", () => {
  it("defaults to off with the 5e attunement limit", () => {
    expect(DEFAULT_RULES.items).toEqual(OFF);
    expect(parseRules({}).items).toEqual(OFF);
  });

  it("falls back to default on an invalid section", () => {
    expect(parseRules({ items: { attunementLimit: 0 } }).items).toEqual(OFF);
    expect(parseRules({ items: { attunementLimit: 11 } }).items).toEqual(OFF);
  });

  it("patches one field", () => {
    const merged = mergeRules(DEFAULT_RULES, RulesetPatchSchema.parse({ items: { enabled: true } }));

    expect(merged.ok && merged.rules.items).toEqual({ enabled: true, attunementLimit: 3 });
  });

  it("is a registered mechanic and the SRD preset turns it on", () => {
    expect(MECHANIC_REGISTRY.items.label).toBe("Предмети");
    expect(SRD_RULES.items).toEqual({ enabled: true, attunementLimit: 3 });
  });
});
