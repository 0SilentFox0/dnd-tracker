import { describe, expect, it } from "vitest";

import { addBranch, cellSkillId, emptyTree, moveBranch, normalizeTree, removeBranch, setCellSkill, skillLocations } from "..";
import { RAW } from "./fixtures";

describe("edit", () => {
  it("setCellSkill ставить і прибирає скіл слота, рівня, расового, ультимейта", () => {
    let raw = setCellSkill(RAW, { kind: "slot", branchId: "defense", circle: "outer", index: 2 }, { id: "new", name: "Нове" });

    expect(normalizeTree({ id: "t", skills: raw }).grid.get("defense")?.outer).toEqual(["d-o1", "d-o2", "new"]);

    raw = setCellSkill(raw, { kind: "slot", branchId: "defense", circle: "outer", index: 0 }, null);
    expect(cellSkillId(raw, { kind: "slot", branchId: "defense", circle: "outer", index: 0 })).toBeNull();
    expect(cellSkillId(raw, { kind: "slot", branchId: "defense", circle: "outer", index: 2 })).toBe("new");

    raw = setCellSkill(raw, { kind: "level", branchId: "light", level: "expert" }, { id: "lx", name: "x" });
    expect(cellSkillId(raw, { kind: "level", branchId: "light", level: "expert" })).toBe("lx");

    raw = setCellSkill(raw, { kind: "racial", level: "expert" }, { id: "rx", name: "x" });
    expect(cellSkillId(raw, { kind: "racial", level: "expert" })).toBe("rx");

    raw = setCellSkill(raw, { kind: "ultimate" }, null);
    expect(cellSkillId(raw, { kind: "ultimate" })).toBeNull();
  });

  it("add / move / remove гілки, racial лишається в кінці", () => {
    let raw = addBranch(RAW, { id: "new", name: "Нова", color: "green" });

    expect(raw.mainSkills.map((b) => b.id)).toEqual(["attack", "defense", "light", "chaos", "new", "racial"]);

    raw = moveBranch(raw, "new", -1);
    expect(raw.mainSkills.map((b) => b.id).slice(3, 5)).toEqual(["new", "chaos"]);

    raw = moveBranch(raw, "attack", -1);
    expect(raw.mainSkills[0].id).toBe("attack");

    raw = removeBranch(raw, "new");
    expect(raw.mainSkills.map((b) => b.id)).toEqual(["attack", "defense", "light", "chaos", "racial"]);
  });

  it("emptyTree і skillLocations", () => {
    const raw = emptyTree("Ельф", [{ id: "attack", name: "Напад", color: "red" }]);

    expect(normalizeTree({ id: "t", skills: raw }).branches.map((b) => b.id)).toEqual(["attack"]);
    expect(skillLocations(RAW).get("o1")).toEqual([{ kind: "slot", branchId: "attack", circle: "outer", index: 0 }]);
  });
});
