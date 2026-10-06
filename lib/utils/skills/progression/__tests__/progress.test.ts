import { describe, expect, it } from "vitest";

import { learnedInTree, readUnlocked, writeUnlocked } from "..";
import { TREE } from "./fixtures";

describe("progress", () => {
  it("читає під id рядка", () => {
    expect(readUnlocked(TREE, { "row-tree": { unlockedSkills: ["o1"] } })).toEqual(["o1"]);
  });

  it("фолбек на JSON id, якщо під id рядка нічого", () => {
    expect(readUnlocked(TREE, { "json-tree": { unlockedSkills: ["o1", "o1", 5] } })).toEqual(["o1"]);
  });

  it("ігнорує інші ключі (старий формат mainSkillId)", () => {
    expect(readUnlocked(TREE, { attack: { unlockedSkills: ["o1"] } })).toEqual([]);
  });

  it("пише під id рядка, прибирає ключ JSON id, інші ключі не чіпає", () => {
    const next = writeUnlocked(TREE, { "json-tree": { level: "basic", unlockedSkills: ["o1"] }, other: { unlockedSkills: ["x"] } }, ["o1", "o2"]);

    expect(next).toEqual({ "row-tree": { level: "basic", unlockedSkills: ["o1", "o2"] }, other: { unlockedSkills: ["x"] } });
  });

  it("learnedInTree відкидає сирот", () => {
    expect(learnedInTree(TREE, ["o1", "gone"])).toEqual(["o1"]);
  });
});
