import { describe, expect, it } from "vitest";

import { learnedSpellIdsFromNodes } from "@/lib/utils/spells";

const spells = [
  { id: "s1", level: 1, spellGroup: { id: "sg" } },
  { id: "s3", level: 3, spellGroup: { id: "sg" } },
  { id: "o1", level: 1, spellGroup: { id: "other" } },
];

describe("learnedSpellIdsFromNodes", () => {
  it("рівень гілки зі школою магії відкриває заклинання рівня; скіл зі школою — basic; newSpellId додається", () => {
    const ids = learnedSpellIdsFromNodes(
      [
        { nodeId: "light_advanced_level", kind: "branchLevel", skillId: null, branchId: "light", level: "advanced", circle: null },
        { nodeId: "x", kind: "slot", skillId: "x", branchId: "attack", level: null, circle: "outer" },
      ],
      { branchSpellGroup: { light: "sg" }, skills: { x: { spellGroupId: "other", newSpellId: "bonus" } }, spells },
    );

    expect(ids.sort()).toEqual(["bonus", "o1", "s1", "s3"].sort());
  });
});
