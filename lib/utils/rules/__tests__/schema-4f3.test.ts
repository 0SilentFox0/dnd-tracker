import { describe, expect, it } from "vitest";

import srdRules from "@/data/templates/srd-5.2/rules.json";
import { DEFAULT_RULES, MECHANIC_REGISTRY } from "@/lib/utils/rules";
import { mergeRules, parseRules, RulesetPatchSchema, RulesetSchema } from "@/lib/utils/rules/schema";

const SRD_RULES = RulesetSchema.parse(srdRules);

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
    expect(MECHANIC_REGISTRY.items).toBe(true);
    expect(SRD_RULES.items).toEqual({ enabled: true, attunementLimit: 3 });
  });
});
