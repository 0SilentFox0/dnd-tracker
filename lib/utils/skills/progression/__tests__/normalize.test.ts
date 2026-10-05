import { describe, expect, it } from "vitest";

import { normalizeTree } from "..";
import { lvl, RAW, TREE } from "./fixtures";

describe("normalizeTree", () => {
  it("гілки в порядку JSON без псевдогілок", () => {
    expect(TREE.branches.map((b) => b.id)).toEqual(["attack", "defense", "light", "chaos"]);
    expect(TREE.branches[2].spellGroupId).toBe("sg-light");
  });

  it("3 рівні кожної гілки існують завжди, skillId з levelSkillIds або null", () => {
    expect(TREE.nodes.get(lvl("attack", "expert"))).toMatchObject({ kind: "branchLevel", branchId: "attack", level: "expert", skillId: "atk-e" });
    expect(TREE.nodes.get(lvl("light", "basic"))).toMatchObject({ kind: "branchLevel", skillId: null });
  });

  it("слоти з basic.circle3/2/1 → outer/middle/inner, id вузла = id скіла", () => {
    expect(TREE.nodes.get("o2")).toEqual({ kind: "slot", nodeId: "o2", branchId: "attack", circle: "outer", index: 1, skillId: "o2" });
    expect(TREE.grid.get("defense")).toEqual({ outer: ["d-o1", "d-o2", null], middle: ["d-m1", null], inner: ["d-i1"] });
  });

  it("расові 3 рівні і ультимейт", () => {
    expect(TREE.nodes.get("racial_basic_racial")).toMatchObject({ kind: "racial", level: "basic", skillId: "r-b" });
    expect(TREE.nodes.get("racial_expert_racial")).toMatchObject({ kind: "racial", level: "expert", skillId: null });
    expect(TREE.ultimateId).toBe("ult");
    expect(TREE.nodes.get("ult")).toMatchObject({ kind: "ultimate" });
  });

  it("id рядка — treeId, id з JSON — jsonId", () => {
    expect(TREE.treeId).toBe("row-tree");
    expect(TREE.jsonId).toBe("json-tree");
  });

  it("мок-плейсхолдери не стають вузлами", () => {
    const raw = {
      ...RAW,
      mainSkills: [{ id: "attack", name: "Напад", color: "red", levels: { basic: { circle3: [{ id: "attack_basic_circle3_skill0" }, { id: "placeholder_x" }, { id: "" }], circle2: [], circle1: [] } } }],
      ultimateSkill: { id: "Ельф_ultimate" },
    };

    const tree = normalizeTree({ id: "t", skills: raw });

    expect(tree.grid.get("attack")?.outer).toEqual([null, null, null]);
    expect(tree.ultimateId).toBeNull();
  });

  it("дубль скіла: перше входження виграє, друге — порожня клітинка", () => {
    const raw = { ...RAW, mainSkills: [...RAW.mainSkills, { id: "dup", name: "Дубль", color: "x", levels: { basic: { circle3: [{ id: "o1" }], circle2: [], circle1: [] } } }] };

    const tree = normalizeTree({ id: "t", skills: raw });

    expect(tree.nodes.get("o1")).toMatchObject({ branchId: "attack" });
    expect(tree.grid.get("dup")?.outer).toEqual([null, null, null]);
  });

  it("сміття замість JSON → порожнє дерево з расовими вузлами", () => {
    const tree = normalizeTree({ id: "t", skills: null });

    expect(tree.branches).toEqual([]);
    expect(tree.nodes.has("racial_basic_racial")).toBe(true);
  });
});
