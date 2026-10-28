import { describe, expect, it } from "vitest";

import { convertMonsterActions } from "../convert/monster-actions";
import { convertUnits } from "../convert/units";
import { FIXTURE_DIR, loadOpen5e } from "../lib/open5e";

const data = loadOpen5e(FIXTURE_DIR);

// These spells are referenced by the creature fixture but omitted by the old spell fixture subset.
for (const name of ["Command", "Scorching Ray", "Detect Magic", "Misty Step", "Invisibility", "Sleep"]) data.spells.push({ ...data.spells[0], pk: `srd-2024_${name.toLowerCase().replaceAll(" ", "-")}`, fields: { ...data.spells[0].fields, name } });

for (const row of data.creatureActions) {
  if (row.fields.name === "Fiery Rays") row.fields.desc = "The dragon casts Scorching Ray, using Charisma as the spellcasting ability (spell save DC 20).";

  if (row.fields.name === "Pounce") row.fields.desc = "The dragon moves up to half its Speed, and it makes one Rend or Bite attack.";
}

const units = convertUnits(data);

const dragon = units.find((u) => u.name === "Adult Red Dragon");

describe("monster 4f-5a conversion", () => {
  it("extracts statblock, lair resistance and uses max walking/flying speed", () => {
    expect(dragon).toMatchObject({ speed: 80, statblock: { creatureType: "dragon", size: "huge", alignment: "chaotic evil", senses: { blindsight: 60, darkvision: 120, passivePerception: 23 }, movement: { fly: 80, climb: 40 }, languages: "Common, Draconic", lairResistances: 4 } });
  });

  it("resolves heading-based spellcasting and generated save-action grants", () => {
    expect(dragon?.spellcasting).toMatchObject({ ability: "charisma", dc: 20, attackBonus: 12 });
    expect(dragon?.spellcasting?.spells).toEqual(expect.arrayContaining([
      expect.objectContaining({ spellId: "Command", castLevel: 2 }),
      expect.objectContaining({ spellId: "Scorching Ray" }),
      expect.objectContaining({ spellId: "Fireball", perBattle: 1 }),
      expect.objectContaining({ spellId: "Fire Breath (Adult Red Dragon)", dc: 21, perBattle: 1, recharge: 5 }),
    ]));
    expect(dragon?.abilities.some((a) => a.name === "Spellcasting")).toBe(false);
    expect(dragon?.abilities.find((a) => a.id === "statblock")?.description).toContain("spell save DC 20");
  });

  it("links legendary attacks and spell casts with once-per-round text", () => {
    expect(dragon?.abilities.find((a) => a.name === "Pounce")).toMatchObject({ perform: { attack: "Rend" }, limits: { legendaryCost: 1 } });
    expect(dragon?.abilities.find((a) => a.name === "Commanding Presence")).toMatchObject({ perform: { spellId: "Command" }, limits: { legendaryCost: 1, perRound: 1 } });
    expect(dragon?.abilities.find((a) => a.name === "Fiery Rays")).toMatchObject({ perform: { spellId: "Scorching Ray" } });
  });

  it("returns generated save-action spells and keeps unsupported source descriptions", () => {
    expect(convertMonsterActions(data).map((s) => s.name)).toEqual(["Fire Breath (Adult Red Dragon)", "Acid Spray (Ankheg)"]);

    const original = data.creatureActions.find((a) => a.fields.name === "Shape-Shift");

    expect(units.flatMap((u) => u.abilities).find((a) => a.name === "Shape-Shift")?.description).toBe(original?.fields.desc);
  });
});

it("preserves inline Hellfire Spellcasting before a trailing empty At Will heading", () => {
  const fixture = structuredClone(data);

  const creature = fixture.creatures[0];

  creature.fields.name = "Pit Fiend";
  fixture.creatureActions = [{ ...fixture.creatureActions[0], fields: { ...fixture.creatureActions[0].fields, parent: creature.pk, name: "Hellfire Spellcasting", action_type: "ACTION", uses_type: "RECHARGE_ON_ROLL", uses_param: 4, desc: "The pit fiend casts Fireball (level 5 version) twice, using Charisma as the spellcasting ability (spell save DC 21). It can replace one spell with Detect Magic.\n\nAt Will:" } }];

  const pit = convertUnits(fixture).find((u) => u.name === "Pit Fiend");

  expect(pit?.spellcasting).toMatchObject({ ability: "charisma", dc: 21, spells: expect.arrayContaining([{ spellId: "Fireball", castLevel: 5, dc: 21, perBattle: 1, recharge: 4 }]) });
  expect(pit?.abilities.find((a) => a.name.startsWith("Hellfire Spellcasting"))?.description).toContain("twice");
});
