import { describe, expect, it } from "vitest";

import { alert, elf, featsById, refs, rogue, sorcerer } from "./fixtures";

import { prunePicks } from "@/lib/utils/characters/choices/prune";
import { choiceSelections } from "@/lib/utils/characters/choices/selections";
import { visitPicks } from "@/lib/utils/characters/choices/walk";
import type { BackgroundData } from "@/types/backgrounds";
import type { ChoicesState } from "@/types/choices";
import type { ResolvedClassEntry } from "@/types/classes";

const background: BackgroundData = { id: "bg", name: "Sage", icon: null, description: null, skillProficiencies: ["arcana"], toolProficiencies: ["Ink"], originFeatId: "f-mi", equipmentText: "Book", choices: [{ id: "asi", label: "ASI", level: 1, kind: "abilityScore", points: 3, count: 3, abilities: ["strength", "dexterity", "wisdom"], max: 20, maxPerAbility: 2 }] };

const allRefs = { ...refs, backgroundsById: { bg: background } };

const resolved = (cls: typeof sorcerer, level: number, choices = {}): ResolvedClassEntry => ({ classId: cls.id, level, choices, class: cls, subclass: null });

const fixtures: Record<string, ChoicesState> = {
  raceSubrace: { raceChoices: { "elven-lineage": [{ id: "wood-elf" }, { id: "ghost" }], "keen-senses": [{ id: "perception" }], gone: [{ id: "x" }] }, feats: [], classes: [] },
  backgroundFeat: { raceChoices: {}, backgroundId: "bg", backgroundChoices: { asi: [{ id: "strength" }, { id: "strength" }] }, backgroundFeatPicks: { cantrips: [{ id: "sp-guidance" }, { id: "sp-deleted" }] }, feats: [{ id: "f-alert", source: "dm" }], classes: [] },
  multiclass: { raceChoices: {}, feats: [], classes: [{ classId: sorcerer.id, level: 4, choices: { cantrips: [{ id: "sp-firebolt" }], metamagic: [{ id: "quickened" }] } }, { classId: rogue.id, level: 2, choices: { "expertise-1": [{ id: "stealth" }] } }, { classId: "cls-missing", level: 1 }] },
  featChain: { raceChoices: {}, feats: [{ id: "f-mi", source: "origin", picks: { cantrips: [{ id: "sp-guidance" }] } }, { id: "f-ghost", source: "dm" }], classes: [{ classId: sorcerer.id, level: 4, choices: { "ability-score-improvement-4": [{ id: "f-grappler", picks: { "grappler-asi": [{ id: "strength" }] } }, { id: "f-gone" }] } }] },
};

describe("choice owner walk characterization", () => {
  for (const [name, state] of Object.entries(fixtures)) {
    it(name, () => {
      const level = 4;

      const withClasses = state.classes.length > 0 || state.feats.length > 0 || !!state.backgroundId;

      expect(visitPicks(state, allRefs, { level, classMode: true })).toMatchSnapshot("visit");
      expect(visitPicks(state, allRefs, { level, classMode: false })).toMatchSnapshot("visit-no-class");
      expect(prunePicks(state, allRefs)).toMatchSnapshot("prune");

      const selections = choiceSelections({
        race: elf,
        raceChoices: state.raceChoices,
        background: state.backgroundId ? background : null,
        backgroundChoices: state.backgroundChoices,
        backgroundFeatPicks: state.backgroundFeatPicks,
        classes: state.classes.map((e) => ({ ...e, class: refs.classesById[e.classId] ?? null, subclass: null })),
        feats: state.feats,
        featsById: { ...featsById, [alert.id]: alert },
        level,
      });

      expect({ withClasses, selections }).toMatchSnapshot("selections");
    });
  }

  it("dedupes spells and grants keeping the first occurrence", () => {
    const s = choiceSelections({ race: null, raceChoices: {}, classes: [resolved(sorcerer, 1, { cantrips: [{ id: "sp-firebolt" }, { id: "sp-firebolt" }] })], feats: [], featsById, level: 1 });

    expect(s.spells.map((x) => x.spellId)).toEqual(["sp-firebolt"]);
  });
});
