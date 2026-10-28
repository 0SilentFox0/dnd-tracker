import { describe, expect, it } from "vitest";

import { asi, grappler } from "./fixtures";

import { DND_SKILL_META } from "@/lib/constants/skills";
import { describeFeatPicks } from "@/lib/utils/characters/choices/describe";

describe("describeFeatPicks", () => {
  it("ability increases are grouped, other picks use names", () => {
    expect(describeFeatPicks(asi, { asi: [{ id: "strength" }, { id: "strength" }] })).toEqual(["+2 СИЛ"]);
    expect(describeFeatPicks(asi, { asi: [{ id: "strength" }, { id: "dexterity" }] })).toEqual(["+1 СИЛ", "+1 СПР"]);
    expect(describeFeatPicks(grappler, {})).toEqual([]);
    expect(describeFeatPicks({ ...asi, choices: [{ id: "s", label: "S", level: 1, count: 2, kind: "skill" }] }, { s: [{ id: "stealth" }, { id: "nope" }] })).toEqual([DND_SKILL_META.stealth.label]);
  });
});
