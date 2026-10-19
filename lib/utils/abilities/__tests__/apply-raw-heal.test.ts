import { describe, expect, it } from "vitest";

import { makeParticipant } from "./fixtures";

import { applyRawHeal } from "@/lib/utils/abilities/engine/effects/hp";

describe("applyRawHeal", () => {
  const hurt = makeParticipant({ id: "t", hp: 10, maxHp: 20 });

  it("heals up to the missing HP", () => {
    expect(applyRawHeal(hurt, 4)).toMatchObject({ healed: 4, participant: { combatStats: { currentHp: 14 } } });
    expect(applyRawHeal(hurt, 99)).toMatchObject({ healed: 10, participant: { combatStats: { currentHp: 20 } } });
  });

  it("returns the same participant when nothing is healed", () => {
    expect(applyRawHeal(hurt, 0).participant).toBe(hurt);
    expect(applyRawHeal(hurt, -5).healed).toBe(0);
    expect(applyRawHeal(makeParticipant({ id: "f", hp: 20, maxHp: 20 }), 5).healed).toBe(0);
  });
});
