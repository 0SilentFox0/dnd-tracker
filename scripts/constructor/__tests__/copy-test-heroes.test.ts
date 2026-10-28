import { describe, expect, it } from "vitest";

import { mapHeroRefs, missingPlayerIds } from "../copy-test-heroes";

const map = new Map([
  ["sp1", "sp1-new"],
  ["sk1", "sk1-new"],
  ["tree1", "tree1-new"],
  ["art1", "art1-new"],
]);

describe("mapHeroRefs", () => {
  const result = mapHeroRefs(
    {
      knownSpells: ["sp1", "unknown-spell"],
      personalSkillId: "sk1",
      skillTreeProgress: { tree1: { level: 2, unlockedSkills: ["sk1", "other"] }, "tree-json": { unlockedSkills: [] } },
    },
    { equipped: { ring1: "art1" }, backpack: ["art1", "x"], items: [{ id: "art1", qty: 1 }] },
    [{ skillTreeId: "tree1", unlockedSkills: ["sk1", "sk-unknown"] }],
    map,
  );

  it("replaces known ids and keeps unknown ones", () => {
    expect(result.knownSpells).toEqual(["sp1-new", "unknown-spell"]);
    expect(result.personalSkillId).toBe("sk1-new");
    expect(result.skillRows).toEqual([{ skillTreeId: "tree1-new", unlockedSkills: ["sk1-new", "sk-unknown"] }]);
  });

  it("replaces skillTreeProgress keys and values", () => {
    expect(result.skillTreeProgress).toEqual({
      "tree1-new": { level: 2, unlockedSkills: ["sk1-new", "other"] },
      "tree-json": { unlockedSkills: [] },
    });
  });

  it("replaces inventory ids", () => {
    expect(result.inventory).toEqual({ equipped: { ring1: "art1-new" }, backpack: ["art1-new", "x"], items: [{ id: "art1-new", qty: 1 }] });
  });

  it("handles missing personal skill and inventory", () => {
    const empty = mapHeroRefs({ knownSpells: [], personalSkillId: null, skillTreeProgress: {} }, null, [], map);

    expect(empty.personalSkillId).toBeNull();
    expect(empty.inventory).toBeNull();
  });
});

describe("missingPlayerIds", () => {
  it("returns distinct controllers that are not members yet", () => {
    expect(missingPlayerIds(["u1", "u2", "u1", "dm"], ["dm", "u2"])).toEqual(["u1"]);
  });
});
