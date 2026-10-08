import { describe, expect, it } from "vitest";

import { createMockParticipant,grantPassive } from "@/lib/utils/battle/__tests__/mock-participant";
import { applyResistance, getCombinedResistancePercent } from "@/lib/utils/battle/resistance";

const evasion = () => grantPassive(createMockParticipant(), [{ kind: "flag", flag: "resistance", damageType: "all", percent: 50, attackKind: "ranged" }], "Ухилення");

describe("resistance з attackKind", () => {
  it("діє лише на атаки цього виду", () => {
    const t = evasion();

    expect(applyResistance(t, 10, "piercing", { attackKind: "ranged" }).finalDamage).toBe(5);
    expect(applyResistance(t, 10, "piercing", { attackKind: "melee" }).finalDamage).toBe(10);
  });

  it("не діє, коли вид атаки невідомий (заклинання, DoT)", () => {
    const t = evasion();

    expect(applyResistance(t, 10, "fire", { fromSpell: true }).finalDamage).toBe(10);
    expect(getCombinedResistancePercent(t, "fire")).toBe(0);
  });

  it("опір без attackKind діє завжди", () => {
    const t = grantPassive(createMockParticipant(), [{ kind: "flag", flag: "resistance", damageType: "all", percent: 50 }]);

    expect(applyResistance(t, 10, "fire", { attackKind: "melee" }).finalDamage).toBe(5);
  });
});
