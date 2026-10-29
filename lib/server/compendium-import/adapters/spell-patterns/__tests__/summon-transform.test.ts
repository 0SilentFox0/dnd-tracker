import { describe, expect, it } from "vitest";

import { spellRow } from "./helpers";

import { SpellDefinitionSchema } from "@/lib/utils/spells/model/schema";

const bush = "You create a Small animated hedge in an unoccupied space of your choice that you can see within range. It has a wooden face but no arms and can't move. Any creature hostile to you that moves to a space within 10 feet of the hedge for the first time on a turn or starts its turn there is targeted by its thorn attack. The hedge makes a ranged weapon attack, using your spell attack modifier. On a hit, a creature takes {@damage 1d4} slashing damage. On your turn, you can use a bonus action to make a hedge use its thorn attack against one creature within 10 feet of it.";

const bushHigher = "When you cast this spell using a spell slot of 2nd level or higher, you can create one additional hedge for every two slot levels above 1st.";

const bushRow = { range: { type: "point", distance: { type: "feet", amount: 60 } }, duration: [{ type: "timed", duration: { type: "minute", amount: 10 } }], damageInflict: ["slashing"] };

const morph = "This spell transforms a beast that you can see within range into a humanoid. An unwilling creature must succeed on a Wisdom saving throw. The target's statistics, excluding mental ability scores, are replaced by the statistics of a {@creature commoner}. If it drops to 0 hit points, it returns to its normal form and excess damage carries over.";

const morphRow = { level: 2, range: { type: "point", distance: { type: "feet", amount: 30 } }, duration: [{ type: "timed", duration: { type: "hour", amount: 1 }, concentration: true }], savingThrow: ["wisdom"] };

describe("summonObject", () => {
  it("stationary object with an aura attack and a bonus-action attack", () => {
    const d = spellRow([bush], bushRow, bushHigher);

    expect(d).toMatchObject({
      native: {
        riders: [],
        fields: {
          targeting: { kind: "template", shape: "circle", size: 5, side: "enemy", maxTargets: 1, range: 60 },
          spellEffects: [
            { kind: "summonInline", name: "Hedge", size: "small", ac: "spellDc", hp: null, count: 1, upcastEvery: 2, duration: { rounds: 99 }, aura: { radiusFeet: 10, side: "enemies", onEnter: { attack: "spell", effects: [{ kind: "dealDamage", amount: "1d4", damageType: "slashing", target: "eventTarget" }] }, onTurnStart: { attack: "spell" } } },
            { kind: "grantCast", cost: "bonusAction", cast: { targeting: { kind: "enemy" }, resolution: { kind: "attack" }, dice: 0, perObjectFeet: 10, effects: [{ kind: "dealDamage", amount: "1d4", damageType: "slashing" }] } },
          ],
        },
      },
    });

    if ("native" in d) expect(SpellDefinitionSchema.safeParse({ cost: "action", raceModifiers: [], ...d.native.fields, effects: d.native.fields.spellEffects }).error?.issues ?? []).toEqual([]);
  });

  it("no upcast clause means no upcastEvery", () => {
    expect(spellRow([bush], bushRow)).toMatchObject({ native: { fields: { spellEffects: [{ kind: "summonInline" }, { kind: "grantCast" }] } } });
  });

  it("negative: a mobile object or no bonus attack is not recognized", () => {
    expect("native" in spellRow([bush.replace("can't move", "walks slowly")], bushRow)).toBe(false);
    expect("native" in spellRow([bush.replace(/On your turn[^.]*\./, "")], bushRow)).toBe(false);
  });
});

describe("transformSpell", () => {
  it("emits transform, beast filter, WIS save and a creature ref", () => {
    const d = spellRow([morph], morphRow, "The spell's duration increases by 1 hour for each slot level above 2nd.");

    expect(d).toMatchObject({
      native: {
        riders: expect.arrayContaining(["тривалість обрізана до 99 раундів"]),
        refs: [{ path: ["spellEffects", 0, "unitId"], kind: "monster", name: "commoner", source: "" }],
        fields: {
          targeting: { kind: "enemy", range: 30, filter: { creatureTypes: ["beast"] } },
          resolution: { kind: "save", ability: "wisdom", onSuccess: "none" },
          spellEffects: [{ kind: "transform", unitId: "commoner", revertAtZero: true, duration: { rounds: 99 } }],
        },
      },
    });

    if ("native" in d) expect(SpellDefinitionSchema.safeParse({ cost: "action", raceModifiers: [], ...d.native.fields, effects: d.native.fields.spellEffects }).error?.issues ?? []).toEqual([]);
  });

  it("creature source is kept in the ref", () => {
    const d = spellRow([morph.replace("{@creature commoner}", "{@creature commoner|MM}")], morphRow);

    expect(d).toMatchObject({ native: { refs: [{ name: "commoner", source: "MM" }] } });
  });

  it("negative: no revert at 0 HP or no creature tag stays manual", () => {
    expect("native" in spellRow([morph.replace("drops to 0 hit points", "is dismissed")], morphRow)).toBe(false);
    expect("native" in spellRow([morph.replace("{@creature commoner}", "commoner")], morphRow)).toBe(false);
  });
});
