import { describe, expect, it } from "vitest";

import { elf, featsById, rogue, sorcerer } from "./fixtures";

import type { SelectionInput } from "@/lib/utils/characters/choices/selections";
import { choiceSelections, selectionNeedsFeats } from "@/lib/utils/characters/choices/selections";
import type { ResolvedClassEntry } from "@/types/classes";

const entry = (cls: typeof sorcerer, level: number, choices = {}): ResolvedClassEntry => ({ classId: cls.id, level, choices, class: cls, subclass: null });

const run = (over: Partial<SelectionInput>) => choiceSelections({ race: null, raceChoices: {}, classes: [], feats: [], featsById, level: 1, ...over });

describe("choiceSelections", () => {
  it("race lineage: option abilities under the race source, spells up to the total level, lineage name", () => {
    const s = run({ race: elf, raceChoices: { "elven-lineage": [{ id: "wood-elf" }], "keen-senses": [{ id: "perception" }] }, level: 3 });

    expect(s.lineage).toBe("Wood Elf");
    expect(s.groups[0]).toMatchObject({ source: { type: "race", id: "race-elf", name: "Elf: Wood Elf" }, abilities: [{ id: "race.elven-lineage.wood-elf.speed" }] });
    expect(s.spells).toEqual([{ spellId: "sp-druidcraft", label: "Лінія: Wood Elf" }, { spellId: "sp-longstrider", label: "Лінія: Wood Elf" }]);
    expect(s.skills).toEqual(["perception"]);
    expect(run({ race: elf, raceChoices: { "elven-lineage": [{ id: "wood-elf" }] }, level: 1 }).spells).toEqual([{ spellId: "sp-druidcraft", label: "Лінія: Wood Elf" }]);
  });

  it("class options carry the class scale; picks of closed choices do nothing", () => {
    const s = run({ classes: [entry(sorcerer, 2, { metamagic: [{ id: "quickened" }] })], level: 2 });

    expect(s.groups[0]).toMatchObject({ source: { type: "class", id: "cls-sorc", name: "Sorcerer: Metamagic — Quickened Spell" }, scale: { classId: "cls-sorc", level: 2 } });
    expect(s.options).toEqual([{ owner: "Sorcerer", label: "Metamagic", names: ["Quickened Spell"] }]);
    expect(run({ classes: [entry(sorcerer, 1, { metamagic: [{ id: "quickened" }] })] }).groups).toEqual([]);
  });

  it("feats: own abilities under the feat source, nested spell picks, origin and DM feats; unknown feats skipped", () => {
    const s = run({
      classes: [entry(sorcerer, 4, { "ability-score-improvement-4": [{ id: "f-grappler", picks: { "grappler-asi": [{ id: "strength" }] } }, { id: "f-ghost" }] })],
      feats: [{ id: "f-mi", source: "origin", picks: { cantrips: [{ id: "sp-guidance" }] } }, { id: "f-alert", source: "dm" }],
      level: 4,
    });

    expect(s.feats.map((f) => [f.feat.name, f.from])).toEqual([["Grappler", "Sorcerer 4"], ["Magic Initiate", "Походження"], ["Alert", "ДМ"]]);
    expect(s.groups.filter((g) => g.source.type === "feat").map((g) => g.source.name)).toEqual(["Grappler", "Alert"]);
    expect(s.spells).toEqual([{ spellId: "sp-guidance", label: "Риса: Magic Initiate" }]);
  });

  it("class spell picks and expertise become synthetic flags", () => {
    const s = run({ classes: [entry(sorcerer, 1, { cantrips: [{ id: "sp-firebolt" }] }), entry(rogue, 1, { "expertise-1": [{ id: "stealth" }] })] });

    expect(s.spells).toEqual([{ spellId: "sp-firebolt", label: "Клас: Sorcerer" }]);
    expect(s.expertise).toEqual(["stealth"]);
    expect(s.groups.at(-1)).toMatchObject({ source: { type: "character", id: "choices" }, abilities: [{ id: "choice-expertise", effects: [{ kind: "flag", flag: "skillExpertise", skills: ["stealth"] }] }] });
  });

  it("keeps separate stable grant sources when the same spell is selected twice", () => {
    const lineage = {
      ...elf,
      choices: [{
        id: "lineage",
        label: "Lineage",
        level: 1,
        count: 1,
        kind: "option" as const,
        options: [{ id: "drow", name: "Drow", abilities: [], spells: [{ level: 1, spellId: "sp-missile", grant: { uses: 1, rest: "long" as const, castLevel: 1, via: "slotOrGrant" as const } }] }],
      }],
    };

    const initiate = { ...featsById["f-mi"], choices: [{ id: "initiate", label: "Initiate", level: 1, count: 1, kind: "spell" as const, spells: { lists: ["Wizard"], minLevel: 1, maxLevel: 1 }, grant: { uses: 1, rest: "long" as const, castLevel: 1, via: "slotOrGrant" as const } }] };

    const selected = run({ race: lineage, raceChoices: { lineage: [{ id: "drow" }] }, feats: [{ id: "f-mi", source: "origin", picks: { initiate: [{ id: "sp-missile" }] } }], featsById: { ...featsById, "f-mi": initiate } as typeof featsById });

    expect(selected.spells.map((s) => s.spellId)).toEqual(["sp-missile"]);
    expect(selected.spellGrants).toEqual([
      { spellId: "sp-missile", label: "Elf: Drow", sourceKey: "race:race-elf:lineage:drow:sp-missile", grantPolicy: { uses: 1, rest: "long", castLevel: 1, via: "slotOrGrant" } },
      { spellId: "sp-missile", label: "Риса: Magic Initiate", sourceKey: "feat:f-mi:initiate:sp-missile", grantPolicy: { uses: 1, rest: "long", castLevel: 1, via: "slotOrGrant" } },
    ]);
  });

  it("keeps a grant key when labels and option order change", () => {
    const race = { ...elf, choices: [{ id: "lineage", label: "Lineage", level: 1, count: 1, kind: "option" as const, options: [{ id: "drow", name: "Drow", abilities: [], spells: [{ level: 1, spellId: "sp-missile", grant: { uses: 1, rest: "long" as const } }] }, { id: "wood", name: "Wood", abilities: [], spells: [] }] }] };

    const renamed = { ...race, name: "Elf (Updated)", choices: [{ ...race.choices[0], options: [{ ...race.choices[0].options[1], name: "Woodlands" }, { ...race.choices[0].options[0], name: "Drow (Updated)" }] }] };

    const before = run({ race, raceChoices: { lineage: [{ id: "drow" }] } }).spellGrants[0];

    const after = run({ race: renamed, raceChoices: { lineage: [{ id: "drow" }] } }).spellGrants[0];

    expect(after.sourceKey).toBe(before.sourceKey);
    expect(after.label).not.toBe(before.label);
  });

  it("selectionNeedsFeats: only with picks or feats", () => {
    expect(selectionNeedsFeats({ raceChoices: {}, feats: [], classes: [{ classId: "c", level: 1 }] }, true)).toBe(false);
    expect(selectionNeedsFeats({ raceChoices: {}, feats: [{ id: "f", source: "dm" }], classes: [] }, true)).toBe(true);
    expect(selectionNeedsFeats({ raceChoices: {}, feats: [{ id: "f", source: "dm" }], classes: [] }, false)).toBe(false);
    expect(selectionNeedsFeats({ raceChoices: { v: [{ id: "f" }] }, feats: [], classes: [] }, false)).toBe(true);
  });
});
