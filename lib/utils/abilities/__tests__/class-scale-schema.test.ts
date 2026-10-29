import { describe, expect, it } from "vitest";

import { ukT } from "@/lib/utils/abilities/__tests__/describe-fixtures";
import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { resolveAmount, resolveFlat } from "@/lib/utils/abilities/engine/core/amount";
import { battleLimit, restUses, withinCountLimits } from "@/lib/utils/abilities/engine/core/usage";
import { amountSegment, flatSegment, limitsSegments } from "@/lib/utils/abilities/registry/labels";
import { AbilitySchema, AmountSchema, FlatSchema, LimitsSchema } from "@/lib/utils/abilities/schema";
import { renderSegment, renderSegments } from "@/lib/utils/abilities/segments";

describe("scale refs in the schema", () => {
  it("Flat, Amount and perRest.uses accept { scale }; uses also { formula }", () => {
    expect(FlatSchema.safeParse({ scale: "rage-damage" }).success).toBe(true);
    expect(AmountSchema.safeParse({ scale: "sneak-attack" }).success).toBe(true);
    expect(LimitsSchema.safeParse({ perRest: { rest: "long", uses: { scale: "rages" } } }).success).toBe(true);
    expect(LimitsSchema.safeParse({ perRest: { rest: "long", uses: { formula: "max(1, cha_mod)" } } }).success).toBe(true);
    expect(FlatSchema.safeParse({ scale: "Rage Damage" }).success).toBe(false);
  });

  it("pool: key and cost 1..20", () => {
    expect(LimitsSchema.safeParse({ pool: { key: "focus-points", cost: 1 } }).success).toBe(true);
    expect(LimitsSchema.safeParse({ pool: { key: "focus-points", cost: 0 } }).success).toBe(false);
    expect(LimitsSchema.safeParse({ pool: { key: "focus-points", cost: 21 } }).success).toBe(false);
  });

  it("old values still parse", () => {
    expect(AbilitySchema.safeParse({ id: "a", name: "A", trigger: { event: "bonusAction" }, limits: { perRest: { rest: "short", uses: 1 } }, effects: [{ kind: "heal", amount: "1d10" }] }).success).toBe(true);
  });
});

describe("unresolved refs in the engine", () => {
  const owner = makeParticipant({ id: "o" });

  it("resolve to 0; a scale or formula perRest makes the ability unavailable", () => {
    expect(resolveFlat({ scale: "rage-damage" }, owner)).toBe(0);
    expect(resolveAmount({ scale: "sneak-attack" }, { owner, rng: () => 0.5 })).toBe(0);
    expect(restUses({ perRest: { rest: "long", uses: { scale: "rages" } } })).toBe(0);
    expect(restUses({ perRest: { rest: "long", uses: 3 } })).toBe(3);
    expect(restUses({})).toBeUndefined();
    expect(battleLimit({ perRest: { rest: "long", uses: { formula: "cha_mod" } } })).toBe(0);
    expect(withinCountLimits(owner, resolved({ trigger: { event: "bonusAction" }, limits: { perRest: { rest: "long", uses: { scale: "rages" } } }, effects: [{ kind: "note", text: "x" }] }))).toBe(false);
  });

  it("labels show the column key", async () => {
    const t = await ukT();

    const r = (seg: Parameters<typeof renderSegment>[1]) => renderSegment(t, seg);

    expect(r(flatSegment({ scale: "rage-damage" }))).toBe("+[rage-damage]");
    expect(r(amountSegment({ scale: "sneak-attack" }))).toBe("[sneak-attack]");
    expect(renderSegments(t, limitsSegments({ perRest: { rest: "long", uses: { scale: "rages" } } }))).toEqual(["[rages] разів за довгий відпочинок"]);
    expect(renderSegments(t, limitsSegments({ perRest: { rest: "long", uses: { formula: "max(1, cha_mod)" } } }))).toEqual(["(max(1, cha_mod)) разів за довгий відпочинок"]);
    expect(renderSegments(t, limitsSegments({ pool: { key: "focus-points", cost: 3 } }))).toEqual(["пул «focus-points»: 3"]);
  });
});
