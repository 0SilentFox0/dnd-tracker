import { describe, expect, it } from "vitest";

import { spellEffectsFormula } from "@/lib/utils/battle/spell/caster-dice";

describe("spellEffectsFormula", () => {
  it("byDistance shows the range of dice", () => {
    expect(spellEffectsFormula([{ kind: "dealDamage", amount: { spellRoll: 100 }, byDistance: [{ maxFeet: 10, dice: "5d6" }, { maxFeet: 60, dice: "4d6" }, { maxFeet: 120, dice: "3d6" }] }])).toBe("5к6…3к6");
  });

  it("chooseOne heal lists distinct dice", () => {
    expect(spellEffectsFormula([{ kind: "chooseOne", options: [{ kind: "heal", amount: "2d8" }, { kind: "heal", amount: "2d8" }, { kind: "heal", amount: "1d6" }] }])).toBe("2к8 / 1к6");
  });

  it("no damage or healing shows nothing", () => {
    expect(spellEffectsFormula([{ kind: "applyCondition", condition: "charmed", duration: { rounds: 5 } }])).toBe("");
  });

  it("flat damage without dice keeps the no-dice label", () => {
    expect(spellEffectsFormula([{ kind: "dealDamage", amount: 5 }])).toBe("без кубиків");
  });
});
