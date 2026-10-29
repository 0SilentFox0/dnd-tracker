import { describe, expect, it } from "vitest";

import { spellRow } from "./helpers";

const range = { type: "point", distance: { type: "feet", amount: 60 } };

describe("byDistanceDamage", () => {
  const entries = ["Make a ranged spell attack. On a hit the target takes damage by distance. 1-10 feet: {@dice 5d6} 11-60 feet: {@dice 4d6} 61-120 feet: {@dice 3d6}"];

  it("a table of ranges becomes byDistance with an attack roll", () => {
    expect(spellRow(entries, { range, damageInflict: ["cold"], spellAttack: ["R"] }, "The damage increases by 1d6 for each spell slot level above 1st.")).toMatchObject({
      native: {
        fields: {
          targeting: { kind: "enemy", range: 60 },
          resolution: { kind: "attack" },
          dice: 0,
          upcastDice: 1,
          spellEffects: [{ kind: "dealDamage", damageType: "cold", amount: { spellRoll: 100 }, byDistance: [{ maxFeet: 10, dice: "5d6" }, { maxFeet: 60, dice: "4d6" }, { maxFeet: 120, dice: "3d6" }] }],
        },
      },
    });
  });

  it("descending or off-grid ranges are not matched", () => {
    const d = spellRow(["Make a ranged spell attack. 11-60 feet: {@dice 4d6} 1-10 feet: {@dice 5d6}"], { range, damageInflict: ["cold"], spellAttack: ["R"] });

    expect(d).toMatchObject({ blocker: "VARIABLE_DAMAGE" });
    expect(JSON.stringify(spellRow(["Make a ranged spell attack. 1-7 feet: {@dice 5d6} 8-60 feet: {@dice 4d6}"], { range, damageInflict: ["cold"], spellAttack: ["R"] }))).not.toContain("byDistance");
  });

  it("a single row is not a table", () => {
    expect(JSON.stringify(spellRow(["Make a ranged spell attack. 1-10 feet: {@dice 5d6}"], { range, damageInflict: ["cold"], spellAttack: ["R"] }))).not.toContain("byDistance");
  });
});

describe("fallingDamage", () => {
  const entries = ["A flying creature must make a Strength saving throw. On a failure it falls and takes {@dice 1d6} bludgeoning damage for every 10 feet it fell, to a maximum of 20d6, and has the prone condition."];

  const row = { range, savingThrow: ["strength"], damageInflict: ["bludgeoning"] };

  it("becomes inputDice with a flyer filter and prone", () => {
    expect(spellRow(entries, row)).toMatchObject({
      native: {
        fields: {
          targeting: { kind: "enemy", range: 60, filter: { movement: "fly" } },
          resolution: { kind: "save", ability: "strength", onSuccess: "none" },
          dieSides: 6,
          spellEffects: [
            { kind: "inputDice", max: 20 },
            { kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "bludgeoning" },
            { kind: "applyCondition", condition: "prone" },
          ],
        },
      },
    });
  });

  it("recognises the 'pulled to the ground' wording as prone", () => {
    const text = ["A flying creature must make a Strength saving throw. On a failure it is pulled to the ground and takes {@dice 1d6} bludgeoning damage for every 10 feet it fell, to a maximum of 20d6."];

    expect(spellRow(text, row)).toMatchObject({ native: { fields: { spellEffects: [{ kind: "inputDice" }, { kind: "dealDamage" }, { kind: "applyCondition", condition: "prone" }] } } });
  });

  it("without the maximum it stays a variable-damage blocker", () => {
    const text = ["A creature takes {@dice 1d6} damage for every 10 feet it fell."];

    expect(spellRow(text, row)).toMatchObject({ blocker: "VARIABLE_DAMAGE" });
  });
});

describe("push rider", () => {
  const entries = ["The target must make a Strength saving throw or take {@damage 2d6} force damage and be pushed up to 15 feet away from you."];

  it("becomes a push effect and no longer a rider", () => {
    expect(spellRow(entries, { range, savingThrow: ["strength"], damageInflict: ["force"] })).toMatchObject({
      native: { riders: [], fields: { spellEffects: [{ kind: "dealDamage" }, { kind: "push", feet: 15, from: "caster" }] } },
    });
  });

  it("an off-grid distance keeps the rider", () => {
    const d = spellRow(["The target must make a Strength saving throw or take {@damage 2d6} force damage and be pushed up to 12 feet away from you."], { range, savingThrow: ["strength"], damageInflict: ["force"] });

    expect(JSON.stringify(d)).not.toContain('"push"');
    expect(JSON.stringify(d)).toContain("поштовх");
  });
});

describe("delayedStrike", () => {
  const entries = [
    "A swarm flies toward a creature you can see within range. If the target is within 30 feet of you when you cast the spell, the swarm collides with the target, dealing {@damage 8d6} slashing damage to it.",
    "If the target is farther than 30 feet away from you when you cast the spell, the swarm travels at a rate of 30 feet per round toward the target. While the swarm is traveling, it can be attacked.",
  ];

  const higher = "When you cast this spell using a spell slot of 6th level or higher, the target takes an extra 2d6 slashing damage for each slot level above 5th.";

  it("near-hit dice plus travel speed become delayIfBeyond with an automatic hit", () => {
    expect(spellRow(entries, { range: { type: "point", distance: { type: "feet", amount: 300 } }, damageInflict: ["slashing"] }, higher)).toMatchObject({
      native: {
        riders: [expect.stringContaining("атакувати")],
        fields: {
          targeting: { kind: "enemy", range: 300 },
          resolution: { kind: "auto" },
          dice: 8,
          dieSides: 6,
          upcastDice: 2,
          spellEffects: [{ kind: "dealDamage", damageType: "slashing", delayIfBeyond: { feet: 30, perRoundFeet: 30 } }],
        },
      },
    });
  });

  it("without a travel clause or with a save it is not matched", () => {
    expect(JSON.stringify(spellRow([entries[0]], { range, damageInflict: ["slashing"] }))).not.toContain("delayIfBeyond");
    expect(JSON.stringify(spellRow(entries, { range, damageInflict: ["slashing"], savingThrow: ["dexterity"] }))).not.toContain("delayIfBeyond");
  });
});
