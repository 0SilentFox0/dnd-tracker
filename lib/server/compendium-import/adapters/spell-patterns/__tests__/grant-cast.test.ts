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

  it("an action that creates a missile and a later spell attack with damage-type-first wording is a grant", () => {
    const d = spellRow(["For the duration, you can use your action to create and hurl a pebble. When you do so, make a ranged spell attack against a creature within 30 feet of you. On a hit, the target takes bludgeoning damage equal to {@dice 1d6} + your spellcasting ability modifier."], { range: { type: "point", distance: { type: "self" } }, duration: [{ type: "timed", duration: { type: "hour", amount: 1 } }], spellAttack: ["R"] });

    expect(d).toMatchObject({ native: { fields: { targeting: { kind: "self" }, spellEffects: [{ kind: "grantCast", cost: "action", cast: { targeting: { kind: "enemy", range: 30 }, dice: 1, dieSides: 6, addAbilityMod: true, effects: [{ damageType: "bludgeoning" }] } }] } } });
  });

  it("a conjured weapon-object that a creature can wield becomes an ally grant, the bite heal stays a rider", () => {
    const d = spellRow(["A sprig appears. For the duration, a creature can use the carved root as a melee weapon with which it is proficient. The root deals {@damage 1d12} slashing damage on a hit (adding your ability modifier to the damage roll as normal). A creature can take a bite, healing it for a number of hit points equal to the die."], { range: { type: "point", distance: { type: "feet", amount: 30 } }, duration: [{ type: "timed", duration: { type: "minute", amount: 1 }, concentration: true }], damageInflict: ["slashing"] });

    expect(d).toMatchObject({
      native: { riders: ["bite heal"], fields: { targeting: { kind: "ally", range: 30 }, spellEffects: [{ kind: "grantCast", cost: "action", target: "eventTarget", cast: { targeting: { kind: "enemy", range: 5 }, resolution: { kind: "attack" }, dice: 1, dieSides: 12, addAbilityMod: true } }] } },
    });
  });

  it("a weapon the caster merely enchants is not matched", () => {
    const d = spellRow(["You touch a weapon. A creature can use the weapon as a melee weapon and it deals extra damage."], { damageInflict: ["fire"] });

    expect(JSON.stringify(d)).not.toContain("grantCast");
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
