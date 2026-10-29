import { describe, expect, it } from "vitest";

import { spellRow } from "./helpers";

const self = { range: { type: "point", distance: { type: "self" } }, duration: [{ type: "timed", duration: { type: "minute", amount: 1 } }] };

describe("hitRiderSpell", () => {
  it("the next three ranged hits with extra dice become a hitRider with charges", () => {
    const d = spellRow(["For the duration, the next three times you hit a creature with a ranged weapon attack, the target takes an extra {@damage 1d6} force damage."], { ...self, damageInflict: ["force"] });

    expect(d).toMatchObject({ native: { fields: { targeting: { kind: "self" }, spellEffects: [{ kind: "hitRider", attackKind: "ranged", extraDice: "1d6", damageType: "force", charges: 3, duration: { rounds: 10 } }] } } });
    expect(JSON.stringify(d)).not.toContain("consumeOnMiss");
  });

  it("hits or misses spends charges on a miss and a saving throw with a push is modeled", () => {
    const d = spellRow(["The next two times you make a melee weapon attack, hit or miss, the target takes an extra {@damage 2d8} thunder damage and must succeed on a Strength saving throw or be pushed 10 feet away from you."], { ...self, damageInflict: ["thunder"], savingThrow: ["strength"] });

    expect(d).toMatchObject({ native: { fields: { spellEffects: [{ kind: "hitRider", attackKind: "melee", charges: 2, consumeOnMiss: true, save: { ability: "strength", onFail: [{ kind: "push", feet: 10, from: "caster" }] } }] } } });
  });

  it("until the end of your turn expires at turn end, and a teleport adds moveSelf", () => {
    const d = spellRow(["You teleport to an unoccupied space adjacent to a creature you can see within range. Until the end of your turn, the next two times you hit with a melee weapon attack, the target takes an extra {@damage 1d8} radiant damage."], { range: { type: "point", distance: { type: "feet", amount: 30 } }, damageInflict: ["radiant"] });

    expect(d).toMatchObject({ native: { fields: { targeting: { kind: "enemy", range: 30 }, spellEffects: [{ kind: "moveSelf", to: "adjacentToTarget" }, { kind: "hitRider", expireAtTurnEnd: true, duration: { rounds: 1 } }] } } });
  });

  it("a save with an effect the rider cannot model is not matched", () => {
    const d = spellRow(["The next three times you hit a creature with a ranged weapon attack, the target takes an extra {@damage 1d6} fire damage and must succeed on a Wisdom saving throw or be frightened."], { ...self, damageInflict: ["fire"], savingThrow: ["wisdom"] });

    expect(JSON.stringify(d)).not.toContain("hitRider");
  });

  it("ordinary weapon-enhancing text without a counted rider is not matched", () => {
    const d = spellRow(["You touch a weapon. Until the spell ends, attacks with it deal an extra {@damage 1d4} fire damage."], { duration: [{ type: "timed", duration: { type: "minute", amount: 1 } }], damageInflict: ["fire"] });

    expect(JSON.stringify(d)).not.toContain("hitRider");
  });
});

describe("moveSelfSpell", () => {
  it("a pure teleport next to a creature becomes moveSelf", () => {
    const d = spellRow(["You teleport to an unoccupied space adjacent to a creature you can see within range."], { range: { type: "point", distance: { type: "feet", amount: 60 } }, duration: [{ type: "instant" }] });

    expect(d).toMatchObject({ native: { fields: { targeting: { kind: "enemy", range: 60 }, spellEffects: [{ kind: "moveSelf", to: "adjacentToTarget" }] } } });
  });

  it("a teleport that also deals damage is left to other rules", () => {
    const d = spellRow(["You teleport to an unoccupied space adjacent to a creature within range. The creature takes {@damage 2d6} fire damage."], { range: { type: "point", distance: { type: "feet", amount: 60 } }, damageInflict: ["fire"] });

    expect(JSON.stringify(d)).not.toContain("moveSelf");
  });

  it("a wind that carries you to a creature plus a single extra-damage melee hit before the end of the turn", () => {
    const d = spellRow(["A wind lifts you up and carries you to a creature you can see within range. The next time you hit a creature with a melee weapon attack before the end of the turn, the attack deals an extra {@damage 2d6} slashing damage."], { range: { type: "point", distance: { type: "feet", amount: 60 } }, damageInflict: ["slashing"] });

    expect(d).toMatchObject({ native: { fields: { targeting: { kind: "enemy", range: 60 }, spellEffects: [{ kind: "moveSelf" }, { kind: "hitRider", attackKind: "melee", extraDice: "2d6", charges: 1, expireAtTurnEnd: true }] } } });
  });

  it("touched ammunition gives one charge per piece, push from the cap and charges spent on a miss", () => {
    const d = spellRow(["You touch one to three pieces of ammunition and imbue them with magic.", "When a creature is hit with a ranged weapon attack using the ammunition, it takes an extra {@damage 1d6} poison damage and must make a Dexterity saving throw. On a failed save, the creature is pushed back a number of feet equal to the damage taken to a maximum of 15 feet. Whether the attack hits or misses, the spell then ends on that piece of ammunition."], { duration: [{ type: "timed", duration: { type: "hour", amount: 1 } }], savingThrow: ["dexterity"], damageInflict: ["poison"] });

    expect(d).toMatchObject({ native: { fields: { targeting: { kind: "self" }, spellEffects: [{ kind: "hitRider", attackKind: "ranged", extraDice: "1d6", damageType: "poison", charges: 3, consumeOnMiss: true, save: { ability: "dexterity", onFail: [{ kind: "push", feet: 15 }] } }] } } });
  });
});
