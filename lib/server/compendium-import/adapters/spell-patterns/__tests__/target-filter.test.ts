import { describe, expect, it } from "vitest";

import { spellRow } from "./helpers";

const base = { range: { type: "point", distance: { type: "feet", amount: 60 } }, duration: [{ type: "timed", duration: { type: "minute", amount: 1 } }] };

describe("controlAnimal", () => {
  const entries = [
    "Choose a beast within range that has a challenge rating of 2 or lower. The target must succeed on a saving throw or be {@condition charmed} by you. While it is charmed, you are {@condition incapacitated}.",
  ];

  const higher = "The maximum challenge rating increases by 1 for each slot level above 4.";

  it("beast CR filter, charm on target and incapacitated on self", () => {
    const d = spellRow(entries, { ...base, level: 4, savingThrow: ["wisdom"], conditionInflict: ["charmed"] }, higher);

    expect(d).toMatchObject({
      native: {
        fields: {
          targeting: { kind: "enemy", range: 60, filter: { creatureTypes: ["beast"], maxCr: 2, maxCrPerLevel: 1 } },
          resolution: { kind: "save", ability: "wisdom", onSuccess: "none" },
          spellEffects: [
            { kind: "applyCondition", condition: "charmed", duration: { rounds: 10 } },
            { kind: "applyCondition", condition: "incapacitated", target: "self", duration: { rounds: 10 } },
          ],
        },
      },
    });
  });

  it("charm without a self-incapacitation clause is not matched", () => {
    const d = spellRow(["Choose a beast with a challenge rating of 2 or lower. The target must succeed on a saving throw or be {@condition charmed} by you."], { ...base, savingThrow: ["wisdom"], conditionInflict: ["charmed"] });

    expect(d).not.toMatchObject({ native: { fields: { spellEffects: [{}, { target: "self" }] } } });
  });
});

describe("beast CR filter on a plain spell", () => {
  it("attaches the filter and per-level growth to targeting", () => {
    const d = spellRow(["A beast with a challenge rating of 1/2 or lower must make a saving throw or take {@damage 2d6} fire damage."], { damageInflict: ["fire"], savingThrow: ["dexterity"] });

    expect(d).toMatchObject({ native: { fields: { targeting: { filter: { creatureTypes: ["beast"], maxCr: 0.5 } } } } });
  });

  it("no beast phrase means no filter", () => {
    const d = spellRow(["The target takes {@damage 2d6} fire damage."], { damageInflict: ["fire"] });

    expect(JSON.stringify(d)).not.toContain("filter");
  });
});

describe("speedAtLeast", () => {
  it("your speed becomes at least N: self modifyStat atLeast", () => {
    const d = spellRow(["You summon a steed. While riding it, your speed becomes at least 60 feet. It carries one rider."], { duration: [{ type: "timed", duration: { type: "hour", amount: 1 } }] });

    expect(d).toMatchObject({
      native: { fields: { targeting: { kind: "self" }, spellEffects: [{ kind: "modifyStat", stat: "speed", atLeast: 60, duration: { rounds: 99 } }] } },
    });
  });

  it("a speed bonus without a floor is not matched", () => {
    expect(spellRow(["Your speed increases by 10 feet."])).not.toMatchObject({ native: { fields: { spellEffects: [{ atLeast: expect.anything() }] } } });
  });
});
