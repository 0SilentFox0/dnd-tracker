import { describe, expect, it } from "vitest";

import { choicesBodyOf, draftChoicesState, stateDraftChoices, storedDraftChoices } from "@/lib/utils/characters/choices/picks";

describe("draft and body mapping", () => {
  it("draft choices ↔ state with the starting class at level 1", () => {
    const state = draftChoicesState({ raceChoices: { l: [{ id: "drow" }] }, classChoices: { cantrips: [{ id: "x" }] } }, "wiz");

    expect(state).toEqual({ raceChoices: { l: [{ id: "drow" }] }, feats: [], classes: [{ classId: "wiz", level: 1, choices: { cantrips: [{ id: "x" }] } }] });
    expect(stateDraftChoices(state)).toEqual({ raceChoices: { l: [{ id: "drow" }] }, feats: [], classChoices: { cantrips: [{ id: "x" }] } });
    expect(draftChoicesState(undefined, undefined)).toEqual({ raceChoices: {}, feats: [], classes: [] });
  });

  it("body carries every class' picks", () => {
    expect(choicesBodyOf({ raceChoices: {}, feats: [], classes: [{ classId: "a", level: 2, choices: { m: [{ id: "q" }] } }, { classId: "b", level: 1 }] })).toEqual({
      raceChoices: {},
      feats: [],
      classChoices: { a: { m: [{ id: "q" }] }, b: {} },
    });
  });

  it("stored draft picks: race picks only for the same race, class picks only for the same class", () => {
    const row = { race: "Elf", raceChoices: { l: [{ id: "drow" }] }, feats: [], classes: [{ classId: "wiz", level: 1, choices: { c: [{ id: "x" }] } }] };

    expect(storedDraftChoices(row, "Elf", "wiz")).toEqual({ raceChoices: { l: [{ id: "drow" }] }, feats: [], classChoices: { c: [{ id: "x" }] } });
    expect(storedDraftChoices(row, "Orc", "rog")).toBeUndefined();
    expect(storedDraftChoices({ race: "Elf" }, "Elf", "wiz")).toBeUndefined();
  });
});
