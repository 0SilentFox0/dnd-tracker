import { describe, expect, it } from "vitest";

import { branchLevels, resolveLearned } from "..";
import { lvl, TREE } from "./fixtures";

describe("resolveLearned", () => {
  it("вузли поточного дерева з рівнем/колом; сироти й чужі ключі відкинуті", () => {
    const learned = resolveLearned(TREE, {
      "row-tree": { unlockedSkills: [lvl("attack", "advanced"), "o1", "racial_basic_racial", "ult", "gone"] },
      attack: { unlockedSkills: ["m1"] },
    });

    expect(learned).toEqual([
      { nodeId: lvl("attack", "advanced"), kind: "branchLevel", skillId: "atk-a", branchId: "attack", level: "advanced", circle: null },
      { nodeId: "o1", kind: "slot", skillId: "o1", branchId: "attack", level: null, circle: "outer" },
      { nodeId: "racial_basic_racial", kind: "racial", skillId: "r-b", branchId: null, level: "basic", circle: null },
      { nodeId: "ult", kind: "ultimate", skillId: "ult", branchId: null, level: null, circle: null },
    ]);
  });

  it("branchLevels — найвищий рівень на гілку", () => {
    const learned = resolveLearned(TREE, { "row-tree": { unlockedSkills: [lvl("attack", "basic"), lvl("attack", "advanced"), lvl("light", "basic")] } });

    expect(branchLevels(learned)).toEqual({ attack: "advanced", light: "basic" });
  });
});
