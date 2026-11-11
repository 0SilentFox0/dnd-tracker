import { describe, expect, it } from "vitest";

import { DEFAULT_RULES } from "../defaults";
import { mergeRules, parseRules, RulesetPatchSchema, RulesetSchema } from "../schema";

import srdRules from "@/data/templates/srd-5.2/rules.json";
import { WFRP_RULES } from "@/lib/utils/rules/systems/wfrp/rules-preset";

const SRD_RULES = RulesetSchema.parse(srdRules);

describe("rules.system", () => {
  it("falls back to homm for empty rules", () => {
    expect(parseRules({}).system).toEqual({ key: "homm" });
  });

  it("legacy rules with classes enabled mean dnd5e", () => {
    expect(parseRules({ classes: { enabled: true } }).system).toEqual({ key: "dnd5e" });
  });

  it("explicit system wins over classes", () => {
    expect(parseRules({ system: { key: "wfrp" }, classes: { enabled: true } }).system).toEqual({ key: "wfrp" });
  });

  it("invalid system falls back instead of the default", () => {
    expect(parseRules({ system: { key: "x" }, classes: { enabled: true } }).system).toEqual({ key: "dnd5e" });
    expect(parseRules({ system: { key: "x" } }).system).toEqual({ key: "homm" });
  });

  it("presets carry their system", () => {
    expect(parseRules(SRD_RULES).system).toEqual({ key: "dnd5e" });
    expect(parseRules(WFRP_RULES).system).toEqual({ key: "wfrp" });
    expect(WFRP_RULES.classes.enabled).toBe(false);
    expect(WFRP_RULES.deathSaves.enabled).toBe(false);
    expect(WFRP_RULES.morale.enabled).toBe(false);
  });

  it("patch schema accepts valid keys only", () => {
    expect(RulesetPatchSchema.safeParse({ system: { key: "wfrp" } }).success).toBe(true);
    expect(RulesetPatchSchema.safeParse({ system: { key: "x" } }).success).toBe(false);
  });

  it("mergeRules changes only the system section", () => {
    const merged = mergeRules(DEFAULT_RULES, { system: { key: "wfrp" } });

    expect(merged).toEqual({ ok: true, rules: { ...DEFAULT_RULES, system: { key: "wfrp" } } });
  });
});
