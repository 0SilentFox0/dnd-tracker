import { describe, expect, it } from "vitest";

import { ABILITY_FIXTURES, EFFECT_FIXTURES, REGISTRY_COVERAGE } from "./describe-fixtures";

import { AbilitySchema, EffectSchema } from "@/lib/utils/abilities/schema";

describe("describe fixtures", () => {
  it.each(ABILITY_FIXTURES.map((a) => [a.id, a] as const))("%s is a valid ability", (_id, a) => {
    const r = AbilitySchema.safeParse(a);

    expect(r.success, JSON.stringify(r.error?.issues)).toBe(true);
  });

  it("every effect fixture is a valid effect", () => {
    for (const e of EFFECT_FIXTURES) expect(EffectSchema.safeParse(e).success, JSON.stringify(e)).toBe(true);
  });

  it("covers every registry entry", () => {
    const effects = new Set(EFFECT_FIXTURES.map((e) => e.kind));

    const flags = new Set(EFFECT_FIXTURES.flatMap((e) => (e.kind === "flag" ? [e.flag] : [])));

    const triggers = new Set(ABILITY_FIXTURES.map((a) => a.trigger.event));

    const conditions = new Set(ABILITY_FIXTURES.flatMap((a) => (a.condition ? [a.condition.type] : [])));

    expect(REGISTRY_COVERAGE.effectKinds.filter((k) => !effects.has(k))).toEqual([]);
    expect(REGISTRY_COVERAGE.flagKeys.filter((k) => !flags.has(k))).toEqual([]);
    expect(REGISTRY_COVERAGE.triggerEvents.filter((k) => !triggers.has(k))).toEqual([]);
    expect(REGISTRY_COVERAGE.conditionTypes.filter((k) => !conditions.has(k))).toEqual([]);
  });
});
