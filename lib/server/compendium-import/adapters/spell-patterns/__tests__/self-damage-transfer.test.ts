import { describe, expect, it } from "vitest";

import { spellRow } from "./helpers";

describe("selfDamageTransfer", () => {
  it("you take XdY damage + target regains that much: self damage then heal from the event", () => {
    const d = spellRow(["Touch a creature. You take {@damage 2d20} necrotic damage, and the target regains hit points equal to the damage you take."], { damageInflict: ["necrotic"] });

    expect(d).toMatchObject({
      native: {
        narrative: false,
        fields: {
          targeting: { kind: "ally", range: 5 },
          resolution: { kind: "auto" },
          dice: 2,
          dieSides: 20,
          spellEffects: [
            { kind: "dealDamage", target: "self", amount: { spellRoll: 100 }, damageType: "necrotic" },
            { kind: "heal", target: "eventTarget", amount: { percentOf: "eventDamage", value: 100 } },
          ],
        },
      },
    });
  });

  it("self damage without a regain clause stays SELF_DAMAGE", () => {
    expect(spellRow(["You take {@damage 2d6} fire damage as the flames recoil."], { damageInflict: ["fire"] })).toEqual({ blocker: "SELF_DAMAGE" });
  });

  it("a regain clause without self damage is not matched", () => {
    expect(spellRow(["The target regains hit points equal to {@damage 2d6}."], { damageInflict: ["necrotic"] })).not.toMatchObject({ native: { fields: { spellEffects: [{ target: "self" }] } } });
  });
});
