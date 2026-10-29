import { describe, expect, it } from "vitest";

import { asi, grappler } from "./fixtures";

import { describeFeatPicks } from "@/lib/utils/characters/choices/describe";

describe("describeFeatPicks", () => {
  it("ability increases are grouped, other picks use names", () => {
    expect(describeFeatPicks(asi, { asi: [{ id: "strength" }, { id: "strength" }] })).toEqual([{ message: "characterProfile.sheet.abilityPick", params: { n: 2, ability: "strength" } }]);
    expect(describeFeatPicks(asi, { asi: [{ id: "strength" }, { id: "dexterity" }] })).toEqual([{ message: "characterProfile.sheet.abilityPick", params: { n: 1, ability: "strength" } }, { message: "characterProfile.sheet.abilityPick", params: { n: 1, ability: "dexterity" } }]);
    expect(describeFeatPicks(grappler, {})).toEqual([]);
    expect(describeFeatPicks({ ...asi, choices: [{ id: "s", label: "S", level: 1, count: 2, kind: "skill" }] }, { s: [{ id: "stealth" }, { id: "nope" }] })).toEqual([{ message: "gameTerms.dndSkills.stealth" }]);
  });
});
