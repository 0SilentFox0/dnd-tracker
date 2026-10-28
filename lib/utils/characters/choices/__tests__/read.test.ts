import { describe, expect, it } from "vitest";

import { classFeatureAbilities, readChoiceList } from "@/lib/utils/abilities/read";
import { hasPicks, readCharacterFeats, readChoices, readPicks, readSpellLists } from "@/lib/utils/characters/choices/read";

const note = { id: "n", name: "N", trigger: { event: "passive" }, effects: [{ kind: "note", text: "N" }] };

describe("tolerant readers", () => {
  it("readPicks keeps two levels, drops junk", () => {
    expect(readPicks({ a: [{ id: "x", picks: { b: [{ id: "y", picks: { c: [{ id: "z" }] } }, { nope: 1 }] } }, "bad"], c: "x" })).toEqual({ a: [{ id: "x", picks: { b: [{ id: "y" }] } }] });
    expect(readPicks(null)).toEqual({});
    expect(hasPicks({ a: [] })).toBe(false);
    expect(hasPicks({ a: [{ id: "x" }] })).toBe(true);
  });

  it("readCharacterFeats keeps origin/dm only", () => {
    expect(readCharacterFeats([{ id: "f", source: "origin" }, { id: "g", source: "class" }, { id: "", source: "dm" }, 3])).toEqual([{ id: "f", source: "origin" }]);
  });

  it("readChoices drops malformed choices and fills defaults", () => {
    expect(readChoices([{ id: "k", label: "K", kind: "skill" }, { id: "x", kind: "nope", label: "X" }, "z"])).toEqual([{ id: "k", label: "K", kind: "skill", level: 1, count: 1 }]);
    expect(readSpellLists(["Wizard", 3, " "])).toEqual(["Wizard"]);
  });

  it("readChoiceList validates option abilities; class features keep choices only when present", () => {
    const list = readChoiceList([{ id: "l", label: "L", kind: "option", options: [{ id: "a", name: "A", abilities: [note, { id: "bad" }] }] }]);

    expect(list[0].options?.[0].abilities).toEqual([expect.objectContaining({ id: "n" })]);
    expect(classFeatureAbilities([{ level: 2, abilities: [] }])).toEqual([{ level: 2, abilities: [] }]);
    expect(classFeatureAbilities([{ level: 2, abilities: [], choices: [{ id: "k", label: "K", kind: "skill" }] }])[0].choices).toHaveLength(1);
  });
});
