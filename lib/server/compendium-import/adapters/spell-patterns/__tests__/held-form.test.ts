import { describe, expect, it } from "vitest";

import { spellRow } from "./helpers";

const conc = { duration: [{ type: "timed", duration: { type: "minute", amount: 1 }, concentration: true }], range: { type: "point", distance: { type: "feet", amount: 30 } } };

const GRASP = "The target must succeed on a Strength or Dexterity saving throw or be {@condition grappled} (escape DC equals your spell save DC). While grappled this way, the target takes {@damage 1d8} necrotic damage at the start of each of its turns.";

describe("grapplingDot", () => {
  it("grapple with spell escape DC plus linked DoT and a two-ability save", () => {
    const d = spellRow([GRASP], { ...conc, savingThrow: ["strength", "dexterity"], damageInflict: ["necrotic"], conditionInflict: ["grappled"] });

    expect(d).toMatchObject({
      native: {
        fields: {
          targeting: { kind: "enemy", range: 30 },
          resolution: { kind: "save", ability: "strength", orAbility: "dexterity", onSuccess: "none" },
          spellEffects: [
            { kind: "applyCondition", condition: "grappled", escapeDc: true, duration: { rounds: 10 } },
            { kind: "dot", damagePerRound: "1d8", damageType: "necrotic", linkedToCondition: true },
          ],
        },
      },
    });
  });

  it("a single-ability save keeps one ability", () => {
    const d = spellRow([GRASP.replace("Strength or Dexterity", "Strength")], { ...conc, savingThrow: ["strength"], damageInflict: ["necrotic"] });

    expect(JSON.stringify(d)).not.toContain("orAbility");
  });

  it("grapple without a spell escape DC is not matched", () => {
    const d = spellRow([GRASP.replace("(escape DC equals your spell save DC)", "")], { ...conc, savingThrow: ["strength"], damageInflict: ["necrotic"] });

    expect(JSON.stringify(d)).not.toContain("escapeDc");
  });
});

describe("armoredForm", () => {
  const self = { range: { type: "point", distance: { type: "self" } }, duration: [{ type: "timed", duration: { type: "minute", amount: 1 }, concentration: true }] };

  it("AC floor, blindsight, damage threshold and a bonus-action attack", () => {
    const d = spellRow(
      ["Your Armor Class becomes at least 20, you gain blindsight out to 30 feet, and you have a damage threshold of 15. You can use a Bonus Action to make a melee spell attack against a creature within 5 feet of you. On a hit, the target takes {@damage 1d10} slashing damage."],
      { ...self, damageInflict: ["slashing"], spellAttack: ["M"] },
    );

    expect(d).toMatchObject({
      native: {
        fields: {
          targeting: { kind: "self" },
          spellEffects: [
            { kind: "modifyStat", stat: "armor", atLeast: 20, duration: { rounds: 10 } },
            { kind: "flag", flag: "sense", sense: "blindsight", range: 30 },
            { kind: "flag", flag: "damageThreshold", value: 15 },
            { kind: "grantCast", cost: "bonusAction", cast: { dice: 1, dieSides: 10 } },
          ],
        },
      },
    });
  });

  it("AC floor alone is native instead of a buff blocker", () => {
    const d = spellRow(["Your Armor Class becomes at least 18 for the duration."], self);

    expect(d).toMatchObject({ native: { fields: { spellEffects: [{ kind: "modifyStat", stat: "armor", atLeast: 18 }] } } });
  });

  it("an attack the grant recognizer cannot model keeps the spell out of native", () => {
    const d = spellRow(["Your Armor Class becomes at least 18. You deal {@damage 2d6} fire damage to nearby creatures."], { ...self, damageInflict: ["fire"] });

    expect(JSON.stringify(d)).not.toContain('"native"');
  });
});

describe("recognizers against the book wording", () => {
  it("a paw that attempts to grapple, with no save in the data, becomes a Str-or-Dex save with escape DC and linked DoT", () => {
    const d = spellRow(["You summon a paw that grasps at a creature within range. The paw attempts to grapple the target, using your spellcasting ability modifier. If you lose the contest, the paw disappears.", "While {@condition grappled} by the paw, a target takes {@damage 1d8} necrotic damage at the start of each of its turns. The target can use its action to attempt to escape the grapple as normal."], { ...conc, damageInflict: ["necrotic"] });

    expect(d).toMatchObject({ native: { fields: { resolution: { kind: "save", ability: "strength", orAbility: "dexterity" }, spellEffects: [{ condition: "grappled", escapeDc: true }, { linkedToCondition: true }] } } });
  });

  it("an armoured shell: AC becomes N if not higher, blindsight, threshold and a spell-attack claw, swim speed stays a rider", () => {
    const d = spellRow(["You create a shell around you. For the duration, your Armor Class becomes 20 (if it wasn't already higher), you gain a swimming speed of 40 feet, and you gain {@sense blindsight} out to a range of 30 feet. In addition, you can use your bonus action to make a melee weapon attack using your claws. This attack uses your spell attack bonus and deals {@damage 1d10} bludgeoning damage on a hit.", "The shell has a damage threshold of 15 hit points."], { range: { type: "point", distance: { type: "self" } }, duration: [{ type: "timed", duration: { type: "minute", amount: 1 }, concentration: true }], damageInflict: ["bludgeoning"] });

    expect(d).toMatchObject({
      native: {
        riders: ["swimming speed"],
        fields: { spellEffects: [{ kind: "modifyStat", stat: "armor", atLeast: 20 }, { flag: "sense", sense: "blindsight", range: 30 }, { flag: "damageThreshold", value: 15 }, { kind: "grantCast", cost: "bonusAction", cast: { targeting: { range: 5 }, dice: 1, dieSides: 10 } }] },
      },
    });
  });

  it("an armour-class formula is not an 'at least' floor", () => {
    const d = spellRow(["Your Armor Class becomes 13 + your Dexterity modifier while you wear no armor."], { range: { type: "point", distance: { type: "self" } } });

    expect(JSON.stringify(d)).not.toContain("atLeast");
  });
});
