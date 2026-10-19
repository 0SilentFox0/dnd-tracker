import { describe, expect, it } from "vitest";

import { createMockParticipant, grantPassive } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { dealResistedDamage, dealResistedHits } from "@/lib/utils/battle/damage/resisted-ability-damage";

function setup(percent?: number) {
  const target = createMockParticipant({ basicInfo: { ...createMockParticipant().basicInfo, id: "t1", name: "Ціль" } });

  if (percent !== undefined) grantPassive(target, [{ kind: "flag", flag: "resistance", damageType: "fire", percent }]);

  return [target];
}

describe("dealResistedDamage", () => {
  it("deals full damage without resistance", () => {
    const r = dealResistedDamage(setup(), "t1", 10, "fire");

    expect(r?.participants[0].combatStats.currentHp).toBe(10);
    expect(r?.dealt).toBe(10);
  });

  it("halves damage for 50% resistance", () => {
    const r = dealResistedDamage(setup(50), "t1", 10, "fire");

    expect(r?.participants[0].combatStats.currentHp).toBe(15);
  });

  it("deals 0 for immunity", () => {
    const r = dealResistedDamage(setup(100), "t1", 10, "fire");

    expect(r?.participants[0].combatStats.currentHp).toBe(20);
  });

  it("ignores an unknown target", () => {
    const ps = setup();

    expect(dealResistedDamage(ps, "nope", 10, "fire")).toBeNull();
  });

  it("flags a target that fell", () => {
    const r = dealResistedDamage(setup(), "t1", 999, "fire");

    expect(r?.downed).toBe(true);
    expect(dealResistedDamage(setup(), "t1", 1, "fire")?.downed).toBe(false);
  });
});

describe("dealResistedHits", () => {
  it("collects dealt amounts and downed victims, skipping unknown targets", () => {
    const r = dealResistedHits(setup(50), [{ targetId: "t1", amount: 10 }, { targetId: "nope", amount: 5 }], { actorId: "a", damageType: "fire" });

    expect(r.results).toEqual([{ targetId: "t1", dealt: 5 }]);
    expect(r.downed).toEqual([]);
  });

  it("reports a downed victim with its actor", () => {
    const r = dealResistedHits(setup(), [{ targetId: "t1", amount: 999 }], { actorId: "a", damageType: "fire" });

    expect(r.downed).toEqual([{ victimId: "t1", actorId: "a" }]);
  });
});
