import { describe, expect, it } from "vitest";

import { saveAction } from "../convert/monster-actions";
import { type Fixture, FIXTURE_DIR, loadOpen5e,type O5Creature, type O5CreatureAction } from "../lib/open5e";

const creature = loadOpen5e(FIXTURE_DIR).creatures.find((c) => c.fields.name === "Adult Red Dragon") as Fixture<O5Creature>;

const action = (desc: string, fields: Partial<O5CreatureAction> = {}): Fixture<O5CreatureAction> => ({
  model: "api_v2.creatureaction", pk: "srd-2024_adult-red-dragon_fire-breath",
  fields: { parent: creature.pk, name: "Fire Breath", action_type: "ACTION", uses_type: "RECHARGE_ON_ROLL", uses_param: 5, desc, ...fields },
});

describe("saveAction", () => {
  it("converts a breath to fixed dice, exact source text and a recharge grant", () => {
    const row = action("Dexterity Saving Throw: DC 21, each creature in a 60-foot Cone. Failure: 59 (17d6 + 3) Fire damage. Success: Half damage.");

    expect(saveAction(row, creature)).toMatchObject({
      spell: { slug: row.pk, name: "Fire Breath (Adult Red Dragon)", groupId: "Monster Actions", description: row.fields.desc, level: 0, dice: 17, dieSides: 6, damageBonus: 3, fixedDice: true, targeting: { kind: "template", shape: "cone", size: 60 }, resolution: { kind: "save", ability: "dexterity", onSuccess: "half" }, spellEffects: [{ kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "fire" }] },
      grant: { spellId: "Fire Breath (Adult Red Dragon)", dc: 21, perBattle: 1, recharge: 5 },
    });
  });

  it.each([
    ["a 90-foot-long, 5-foot-wide Line", "line", 90],
    ["a 20-foot-radius Sphere centered on a point within 120 feet", "circle", 20],
    ["a 10-foot-radius, 30-foot-high Cylinder centered on a point within 60 feet", "circle", 10],
    ["a 30-foot Emanation originating from the dragon", "emanation", 30],
  ])("maps %s using the shared template model", (area, shape, size) => {
    const out = saveAction(action(`Constitution Saving Throw: DC 18, each creature in ${area}. Failure: 22 (4d10) Cold damage.`), creature);

    expect(out?.spell.targeting).toMatchObject({ kind: "template", shape, size });

    if (shape === "circle") expect(out?.spell.targeting).toMatchObject({ exact: true });

    if (shape === "emanation") expect(out?.spell.targeting).not.toHaveProperty("range");
  });

  it("maps condition-only actions, single-target range, repeat saves and daily limits", () => {
    const out = saveAction(action("Wisdom Saving Throw: DC 15, one creature within 60 feet. Failure: The target has the Frightened condition for 1 minute. It repeats the save at the end of each of its turns, ending the effect on itself on a success.", { uses_type: "PER_DAY", uses_param: 2 }), creature);

    expect(out).toMatchObject({ spell: { dice: 0, targeting: { kind: "enemy", range: 60 }, resolution: { kind: "save", onSuccess: "none" }, spellEffects: [{ kind: "applyCondition", condition: "frightened", duration: { rounds: 10 }, saveEnds: { ability: "wisdom" } }] }, grant: { perBattle: 2 } });
  });

  it("rest recharge is once per battle and legendary actions are special-only", () => {
    const out = saveAction(action("Dexterity Saving Throw: DC 20, each creature in a 15-foot Cone. Failure: 10 (3d6) Fire damage.", { action_type: "LEGENDARY_ACTION", uses_type: "RECHARGE", uses_param: null }), creature);

    expect(out?.grant).toMatchObject({ perBattle: 1, legendaryOnly: true });
    expect(out?.grant).not.toHaveProperty("recharge");
  });

  it("leaves unsupported effects and attack riders as text fallback", () => {
    expect(saveAction(action("Strength Saving Throw: DC 15, one creature within 30 feet. Failure: The target is pushed 20 feet away."), creature)).toBeNull();
    expect(saveAction(action("Melee Attack Roll: +8, reach 10 ft. Hit: 10 (2d6 + 3) Slashing damage. Strength Saving Throw: DC 15. Failure: The target has the Prone condition."), creature)).toBeNull();
  });

  it("accepts a narrative prefix while preserving delayed damage as text", () => {
    const out = saveAction(action("The devil conjures a chain. Dexterity Saving Throw: DC 15, one creature within 60 feet. Failure: The target has the Restrained condition. At the start of each of its turns, it takes 9 (2d4 + 4) Fire damage."), creature);

    expect(out?.spell).toMatchObject({ dice: 0, spellEffects: [{ kind: "applyCondition", condition: "restrained" }] });
  });

  it("supports combined conditions and exhaustion levels", () => {
    const combined = saveAction(action("Constitution Saving Throw: DC 23, each creature in a 15-foot Emanation. Failure: The target has the Blinded and Poisoned conditions until the end of its next turn."), creature);

    expect(combined?.spell.spellEffects).toMatchObject([{ condition: "blinded" }, { condition: "poisoned" }]);
    expect(saveAction(action("Constitution Saving Throw: DC 16, one creature within 120 feet. Failure: The target gains 1 Exhaustion level."), creature)?.spell.spellEffects).toMatchObject([{ kind: "applyCondition", condition: "exhaustion", levels: 1 }]);
  });
});
