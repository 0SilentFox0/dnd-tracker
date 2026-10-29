import { describe, expect, it } from "vitest";

import { spellRow } from "./helpers";

const self = { range: { type: "point", distance: { type: "self" } }, duration: [{ type: "timed", duration: { type: "minute", amount: 1 }, concentration: true }] };

describe("grantSpellAttack", () => {
  it("a bonus-action melee spell attack for the duration becomes a self grantCast", () => {
    const d = spellRow(["For the duration, you can use a Bonus Action to make a melee spell attack against a creature within 5 feet of you. On a hit, the target takes {@damage 1d8} + your spellcasting ability modifier slashing damage."], { ...self, damageInflict: ["slashing"], spellAttack: ["M"] });

    expect(d).toMatchObject({
      native: {
        fields: {
          targeting: { kind: "self" },
          spellEffects: [{ kind: "grantCast", cost: "bonusAction", duration: { rounds: 10 }, cast: { targeting: { kind: "enemy", range: 5 }, resolution: { kind: "attack" }, dice: 1, dieSides: 8, addAbilityMod: true, effects: [{ kind: "dealDamage", damageType: "slashing", amount: { spellRoll: 100 } }] } }],
        },
      },
    });
    expect(JSON.stringify(d)).not.toContain("eventTarget");
  });

  it("a creature you touch gets the grant itself", () => {
    const d = spellRow(["A creature you touch can use its Action to make a melee spell attack. On a hit, the target takes {@damage 2d6} slashing damage."], { damageInflict: ["slashing"], spellAttack: ["M"], duration: [{ type: "timed", duration: { type: "minute", amount: 1 } }] });

    expect(d).toMatchObject({
      native: { fields: { targeting: { kind: "ally", range: 5 }, spellEffects: [{ kind: "grantCast", cost: "action", target: "eventTarget", cast: { dice: 2, dieSides: 6 } }] } },
    });
    expect(JSON.stringify(d)).not.toContain("addAbilityMod");
  });

  it("an ordinary spell attack is not a grant", () => {
    const d = spellRow(["Make a ranged spell attack against a creature. On a hit, it takes {@damage 1d8} fire damage."], { damageInflict: ["fire"], spellAttack: ["R"], range: { type: "point", distance: { type: "feet", amount: 60 } } });

    expect(JSON.stringify(d)).not.toContain("grantCast");
  });

  it("a save-based spell with the same wording is not matched", () => {
    const d = spellRow(["You can use a Bonus Action to make a melee spell attack. The target makes a Dexterity saving throw and takes {@damage 1d8} fire damage."], { damageInflict: ["fire"], savingThrow: ["dexterity"] });

    expect(JSON.stringify(d)).not.toContain("grantCast");
  });
});
