import { describe, expect, it } from "vitest";

import { spellRow } from "./helpers";

const range = { type: "point", distance: { type: "feet", amount: 60 } };

describe("alternative wordings of the P1 patterns", () => {
  it("control of a beast with an unconscious body is charm + self incapacitated", () => {
    const d = spellRow(["Choose a beast within range. The beast is affected if it has a challenge rating of 1 or lower. An affected creature must succeed on a Wisdom saving throw, or you take total control of it. Your body is considered {@condition unconscious} while this lasts."], { range, savingThrow: ["wisdom"] });

    expect(d).toMatchObject({
      native: { fields: { targeting: { kind: "enemy", filter: { creatureTypes: ["beast"], maxCr: 1 } }, spellEffects: [{ kind: "applyCondition", condition: "charmed" }, { kind: "applyCondition", condition: "incapacitated", target: "self" }] } },
    });
  });

  it("control without a body clause is not matched", () => {
    const d = spellRow(["Choose a beast within range. The beast is affected if it has a challenge rating of 1 or lower. An affected creature must succeed on a Wisdom saving throw, or you take total control of it."], { range, savingThrow: ["wisdom"] });

    expect(JSON.stringify(d)).not.toContain("incapacitated");
  });

  it("a vehicle with a rideable walking speed raises the speed floor", () => {
    const d = spellRow(["You conjure a cart. It has a walking speed of 40 feet, which you can use while riding it."], { miscTags: ["SMN"] });

    expect(d).toMatchObject({ native: { fields: { targeting: { kind: "self" }, spellEffects: [{ kind: "modifyStat", stat: "speed", atLeast: 40 }] } } });
  });

  it("a plain walking speed without a rider clause is not a speed floor", () => {
    expect(spellRow(["You conjure a cart. It has a walking speed of 40 feet."], { miscTags: ["SMN"] })).toMatchObject({ blocker: "SUMMON" });
  });

  it("choice options written as paragraphs", () => {
    const d = spellRow(["You gain one of the following effects of your choice:", "You regain hit points equal to 1d6 + your spellcasting ability modifier.", "Your speed increases by 10 feet until the end of your next turn."], { range: { type: "point", distance: { type: "self" } } });

    expect(d).toMatchObject({
      native: { fields: { targeting: { kind: "self" }, spellEffects: [{ kind: "chooseOne", options: [{ kind: "heal", amount: "1d6" }, { kind: "modifyStat", stat: "speed", flat: 10 }] }] } },
    });
  });

  it("damage reduced by a rolled die, several weapons and upcast targets", () => {
    const d = spellRow(["Up to two weapons within range are coated. Roll a d6; for the duration, any damage dealt by the targeted weapons is reduced by the number you rolled."], { range }, "You can target one additional weapon for each slot level above 1st.");

    expect(d).toMatchObject({
      native: { fields: { targeting: { kind: "area", side: "enemy", maxTargets: 2 }, dice: 1, dieSides: 6, upcastTargets: 1, spellEffects: [{ kind: "damageBonus", flat: { spellRoll: -100 } }] } },
    });
  });
});
