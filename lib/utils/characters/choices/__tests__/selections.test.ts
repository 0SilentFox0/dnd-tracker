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

  it("selectionNeedsFeats: only with picks or feats", () => {
    expect(selectionNeedsFeats({ raceChoices: {}, feats: [], classes: [{ classId: "c", level: 1 }] }, true)).toBe(false);
    expect(selectionNeedsFeats({ raceChoices: {}, feats: [{ id: "f", source: "dm" }], classes: [] }, true)).toBe(true);
    expect(selectionNeedsFeats({ raceChoices: {}, feats: [{ id: "f", source: "dm" }], classes: [] }, false)).toBe(false);
    expect(selectionNeedsFeats({ raceChoices: { v: [{ id: "f" }] }, feats: [], classes: [] }, false)).toBe(true);
  });
});
