import { describe, expect, it } from "vitest";

import { attackFlow, attackPayload, initialAttackFlow } from "@/lib/utils/battle/flows/attack-flow";

const atRoll = attackFlow(attackFlow(initialAttackFlow, { type: "OPEN", weaponCount: 1, attackId: "s", maxTargets: 1, diceSlots: [8], targetIds: ["gob"] }), { type: "CONFIRM_TARGETS" });

describe("attack flow: inspiration", () => {
  it("SET_INSPIRATION sets the flag and the first strike's forced mode", () => {
    const s = attackFlow(atRoll, { type: "SET_INSPIRATION", value: true, forced: { mode: "advantage", reason: "Перевага: Натхнення" } });

    expect(s.inspiration).toBe(true);
    expect(s.strikes[0].forced?.mode).toBe("advantage");
    expect(attackPayload(s, "hero")).toMatchObject({ useInspiration: true });
  });

  it("switching off drops the forced mode", () => {
    const on = attackFlow(atRoll, { type: "SET_INSPIRATION", value: true, forced: { mode: "advantage", reason: "x" } });

    const off = attackFlow(on, { type: "SET_INSPIRATION", value: false });

    expect(off.inspiration).toBeUndefined();
    expect(off.strikes[0].forced).toBeUndefined();
    expect(attackPayload(off, "hero")).not.toHaveProperty("useInspiration");
  });

  it("ignored after the first die is rolled", () => {
    const rolled = attackFlow(attackFlow(attackFlow(initialAttackFlow, { type: "OPEN", weaponCount: 1, attackId: "s", maxTargets: 2, diceSlots: [8], targetIds: ["a", "b"] }), { type: "CONFIRM_TARGETS" }), { type: "ROLL", d20: 10, outcome: "hit" });

    expect(attackFlow(rolled, { type: "SET_INSPIRATION", value: true })).toBe(rolled);
  });
});
