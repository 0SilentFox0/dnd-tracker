import { describe, expect, it } from "vitest";

import { skillPlacements } from "..";
import { RAW } from "./fixtures";

describe("skillPlacements", () => {
  it("місце скіла в деревах: рівні гілки, кола, раса, ультимейт; перше входження виграє", () => {
    const map = skillPlacements([{ id: "a", skills: RAW }, { id: "b", skills: RAW }]);

    expect(map.get("atk-a")).toEqual({ group: 0, label: "skillTree.placement.branchLevel", params: { tier: expect.any(String) } });
    expect(map.get("o1")).toEqual({ group: 1, label: "skillTree.placement.outer" });
    expect(map.get("m1")).toEqual({ group: 2, label: "skillTree.placement.middle" });
    expect(map.get("i1")).toEqual({ group: 3, label: "skillTree.placement.inner" });
    expect(map.get("r-b")).toEqual({ group: 4, label: "skillTree.placement.racial", params: { tier: expect.any(String) } });
    expect(map.get("ult")).toEqual({ group: 5, label: "skillTree.placement.ultimate" });
    expect(map.has("nope")).toBe(false);
  });
});
