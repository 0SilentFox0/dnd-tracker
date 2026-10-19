import { describe, expect, it } from "vitest";

import { createMockParticipant, grantPassive } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { dealResistedDamage } from "@/lib/utils/battle/damage/resisted-ability-damage";

function setup(percent?: number) {
  const target = createMockParticipant({ basicInfo: { ...createMockParticipant().basicInfo, id: "t1", name: "Ціль" } });

  if (percent !== undefined) grantPassive(target, [{ kind: "flag", flag: "resistance", damageType: "fire", percent }]);

  return [target];
}

describe("dealResistedDamage", () => {
  it("deals full damage without resistance", () => {
    const r = dealResistedDamage(setup(), "t1", 10, "fire", "Вогняний вибух");

    expect(r.participants[0].combatStats.currentHp).toBe(10);
    expect(r.message).toContain("Вогняний вибух");
  });

  it("halves damage for 50% resistance", () => {
    const r = dealResistedDamage(setup(50), "t1", 10, "fire", "Вогняний вибух");

    expect(r.participants[0].combatStats.currentHp).toBe(15);
  });

  it("deals 0 for immunity", () => {
    const r = dealResistedDamage(setup(100), "t1", 10, "fire", "Вогняний вибух");

    expect(r.participants[0].combatStats.currentHp).toBe(20);
  });

  it("ignores an unknown target", () => {
    const ps = setup();

    expect(dealResistedDamage(ps, "nope", 10, "fire", "X")).toEqual({ participants: ps, message: "" });
  });
});
