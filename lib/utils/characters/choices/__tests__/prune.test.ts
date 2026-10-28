import { describe, expect, it } from "vitest";

import { empty, refs, sorcerer } from "./fixtures";

import { pruneFormChoices, prunePicks } from "@/lib/utils/characters/choices/prune";

describe("prunePicks", () => {
  it("drops unknown choices, options, feats and spells; keeps valid picks", () => {
    const { state, dropped } = prunePicks(
      {
        ...empty,
        raceChoices: { "elven-lineage": [{ id: "ghost" }, { id: "drow" }], gone: [{ id: "x" }] },
        classes: [{ classId: sorcerer.id, level: 4, choices: { cantrips: [{ id: "sp-firebolt" }, { id: "sp-deleted" }], "ability-score-improvement-4": [{ id: "f-gone" }] } }],
        feats: [{ id: "f-gone", source: "dm" }, { id: "f-alert", source: "origin" }],
      },
      refs,
    );

    expect(state.raceChoices).toEqual({ "elven-lineage": [{ id: "drow" }] });
    expect(state.classes[0].choices).toEqual({ cantrips: [{ id: "sp-firebolt" }] });
    expect(state.feats).toEqual([{ id: "f-alert", source: "origin" }]);
    expect(dropped).toBe(5);
  });
});

describe("pruneFormChoices", () => {
  it("drops picks of the previous race before submit", () => {
    const form = { basicInfo: { classes: [] }, choices: { raceChoices: { "old-race-choice": [{ id: "x" }], "elven-lineage": [{ id: "drow" }] }, feats: [] } };

    expect(pruneFormChoices(form, refs).choices?.raceChoices).toEqual({ "elven-lineage": [{ id: "drow" }] });
  });

  it("returns the form untouched when nothing was picked", () => {
    const form = { basicInfo: {} };

    expect(pruneFormChoices(form, refs)).toBe(form);
  });
});
