import { describe, expect, it } from "vitest";

import { QUALITY_REGISTRY } from "../qualities";
import { QualityRefSchema } from "../stats";

const IMPLEMENTED = ["damaging", "impale", "penetrating", "hack", "pummel", "precise", "accurate", "imprecise", "undamaging", "unreliable", "dangerous", "slow", "fast", "blast", "pistol", "shield", "defensive", "reload", "flexible"];

const STORED_ONLY = ["distract", "entangle", "wrap", "spread", "trapBlade", "unbreakable", "inflict", "repeater"];

describe("QUALITY_REGISTRY", () => {
  it("lists every spec key exactly once", () => {
    expect(Object.keys(QUALITY_REGISTRY).sort()).toEqual([...IMPLEMENTED, ...STORED_ONLY].sort());
  });

  it("flags implemented qualities", () => {
    for (const k of IMPLEMENTED) expect(QUALITY_REGISTRY[k as keyof typeof QUALITY_REGISTRY].implemented).toBe(true);
    for (const k of STORED_ONLY) expect(QUALITY_REGISTRY[k as keyof typeof QUALITY_REGISTRY].implemented).toBe(false);
  });

  it("requires a value iff hasValue", () => {
    expect(QualityRefSchema.safeParse({ key: "shield", value: 2 }).success).toBe(true);
    expect(QualityRefSchema.safeParse({ key: "shield" }).success).toBe(false);
    expect(QualityRefSchema.safeParse({ key: "hack", value: 1 }).success).toBe(false);
    expect(QualityRefSchema.safeParse({ key: "shield", value: 0 }).success).toBe(false);
    expect(QualityRefSchema.safeParse({ key: "shield", value: 21 }).success).toBe(false);
    expect(QualityRefSchema.safeParse({ key: "nope" }).success).toBe(false);
  });
});
