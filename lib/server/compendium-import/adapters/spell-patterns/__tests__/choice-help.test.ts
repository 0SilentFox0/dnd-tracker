import { describe, expect, it } from "vitest";

import { derivedTranslator } from "../../../derived-text";
import { renderEntries } from "../../../entries";
import { spellCast } from "../../spell-cast";
import { deriveSpell } from "../../spell-derive";
import { spellRow } from "./helpers";

const base = { name: "Synthetic Spell", source: "Test", level: 2, school: "A", time: [{ number: 1, unit: "action" }], range: { type: "point", distance: { type: "feet", amount: 30 } }, duration: [{ type: "timed", duration: { type: "minute", amount: 1 } }] };

const derive = (entries: unknown[], extra: Record<string, unknown> = {}) => {
  const row = { ...base, ...extra, entries };

  return deriveSpell(row, renderEntries(entries).text, "", spellCast(row), derivedTranslator());
};

describe("chooseOneSpell", () => {
  const entries = ["Choose one of the following effects for the target.", { type: "list", items: ["It regains {@dice 2d8} hit points.", "Its speed increases by 10 feet.", "It glows softly."] }];

  it("heal, speed and a note option become chooseOne, the note leaves a rider", () => {
    expect(derive(entries)).toMatchObject({
      native: {
        riders: ["варіант 3: див. опис"],
        fields: {
          targeting: { kind: "ally", range: 30 },
          spellEffects: [{ kind: "chooseOne", options: [{ kind: "heal", amount: "2d8" }, { kind: "modifyStat", stat: "speed", flat: 10, duration: { rounds: 10 } }, { kind: "note", text: "It glows softly." }] }],
        },
      },
    });
  });

  it("a list with no recognised option is not matched", () => {
    const d = derive(["Choose one of the following effects.", { type: "list", items: ["It glows softly.", "It hums quietly."] }]);

    expect(JSON.stringify(d)).not.toContain("chooseOne");
  });

  it("without a choice sentence a list is ignored", () => {
    const d = derive(["It heals the target.", { type: "list", items: ["It regains {@dice 2d8} hit points.", "Its speed increases by 10 feet."] }]);

    expect(JSON.stringify(d)).not.toContain("chooseOne");
  });
});

describe("helpAlly", () => {
  it("an ally gains advantage on the next attack roll", () => {
    const d = spellRow(["A creature you touch has advantage on the next attack roll it makes before the spell ends."], { range: { type: "point", distance: { type: "touch" } } });

    expect(d).toMatchObject({ native: { fields: { targeting: { kind: "ally", range: 5 }, spellEffects: [{ kind: "help" }] } } });
  });

  it("a self-range advantage is not a help", () => {
    const d = spellRow(["You have advantage on the next attack roll you make."], { range: { type: "point", distance: { type: "self" } } });

    expect(JSON.stringify(d)).not.toContain('"help"');
  });
});

describe("reduceDamageRoll", () => {
  const entries = ["A creature you can see within range must succeed on a saving throw or roll a {@dice d6} and subtract the number rolled from each weapon damage it deals."];

  it("rolls a die and subtracts it from the target's damage", () => {
    const d = spellRow(entries, { savingThrow: ["wisdom"], duration: [{ type: "timed", duration: { type: "minute", amount: 1 }, concentration: true }] });

    expect(d).toMatchObject({
      native: {
        fields: {
          targeting: { kind: "enemy", range: 5 },
          resolution: { kind: "save", ability: "wisdom" },
          dice: 1,
          dieSides: 6,
          spellEffects: [{ kind: "damageBonus", filter: { kind: "physical" }, flat: { spellRoll: -100 }, duration: { rounds: 10 } }],
        },
      },
    });
  });

  it("a spell that also deals damage is not matched", () => {
    const d = spellRow(entries, { damageInflict: ["fire"] });

    expect(JSON.stringify(d)).not.toContain("spellRoll");
  });
});
