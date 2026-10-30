import { describe, expect, it } from "vitest";

import { buildGraphModel, defaultFilters, entityNodeId, neighbors, sceneNodeId, searchMatches } from "@/lib/utils/scenario/graph/model";
import type { IndexEdge, IndexEntityNode, IndexSceneNode, MentionType, ScenarioIndex } from "@/types/scenario";

const scene = (id: string, order: number, title = id, pageKind: IndexSceneNode["pageKind"] = "scene"): IndexSceneNode => ({
  kind: "scene", id, title, pageKind, status: "draft", order, sections: [],
});

const entity = (type: MentionType, id: string, label: string, sceneIds: string[], missing = false): IndexEntityNode => ({
  kind: "entity", type, id, label, degree: sceneIds.length, sceneIds, missing,
});

const edge = (sceneId: string, entityType: MentionType, entityId: string): IndexEdge => ({
  sceneId, entityType, entityId, count: 1, sectionIds: [], secret: false,
});

const entities = [
  entity("unit", "u1", "Гоблін", ["s1", "s2"]),
  entity("spell", "sp1", "Вогняна куля", ["s1", "s2", "h1"]),
  entity("artifact", "a1", "Меч", ["s1", "s2"]),
  entity("character", "c1", "Алісія", ["s1"]),
  entity("battle", "b1", "Засідка", ["s2"]),
  entity("marker", "m1", "Брама", ["s1"], true),
];

const index: ScenarioIndex = {
  scenes: [scene("s1", 1), scene("s2", 2), scene("h1", 3, "Hero", "hero")],
  entities,
  edges: entities.flatMap((e) => e.sceneIds.map((s) => edge(s, e.type, e.id))),
  counts: { scenes: 3, entities: 6, edges: 10, byType: {}, missing: 1 },
};

const ids = (m: ReturnType<typeof buildGraphModel>) => m.nodes.map((n) => n.id);

describe("buildGraphModel", () => {
  it("builds scene and entity nodes with edges, collapsing leaves", () => {
    const m = buildGraphModel(index, defaultFilters());

    expect(ids(m)).toEqual(["scene:s1", "scene:s2", "scene:h1", "unit:u1", "spell:sp1", "artifact:a1", "marker:m1"]);
    expect(m.truncated).toBe(0);

    const s1 = m.nodes.find((n) => n.id === "scene:s1");

    const s2 = m.nodes.find((n) => n.id === "scene:s2");

    expect(s1?.hidden).toBe(1);
    expect(s2?.hidden).toBe(1);
    expect(s1?.degree).toBe(4);
    expect(m.edges.find((e) => e.id === "s1>unit:u1")).toMatchObject({ source: "scene:s1", target: "unit:u1" });
    expect(m.edges.some((e) => e.target === "character:c1")).toBe(false);
  });

  it("showLeaves expands leaves", () => {
    const m = buildGraphModel(index, { ...defaultFilters(), showLeaves: true });

    expect(ids(m)).toContain("character:c1");
    expect(ids(m)).toContain("battle:b1");
    expect(m.nodes.every((n) => n.hidden === 0)).toBe(true);
  });

  it("caps entities and counts truncated without counting leaves", () => {
    const m = buildGraphModel(index, defaultFilters(), 2);

    expect(m.nodes.filter((n) => n.kind === "entity").map((n) => n.id)).toEqual(["unit:u1", "spell:sp1"]);
    expect(m.truncated).toBe(2);
    expect(m.edges.every((e) => ids(m).includes(e.target))).toBe(true);
  });

  it("showAll ignores the cap", () => {
    const m = buildGraphModel(index, { ...defaultFilters(), showAll: true }, 1);

    expect(m.truncated).toBe(0);
    expect(m.nodes.filter((n) => n.kind === "entity")).toHaveLength(4);
  });

  it("type filter removes nodes and their edges", () => {
    const m = buildGraphModel(index, { ...defaultFilters(), types: new Set<MentionType>(["unit"]) });

    expect(m.nodes.filter((n) => n.kind === "entity").map((n) => n.id)).toEqual(["unit:u1"]);
    expect(m.edges).toHaveLength(2);
    expect(m.nodes.find((n) => n.id === "scene:s1")?.hidden).toBe(0);
  });

  it("onlyMissing keeps missing entities and their scenes", () => {
    const m = buildGraphModel(index, { ...defaultFilters(), onlyMissing: true });

    expect(ids(m)).toEqual(["scene:s1", "marker:m1"]);
    expect(m.edges).toHaveLength(1);
  });

  it("keeps a missing leaf as a node", () => {
    expect(ids(buildGraphModel(index, defaultFilters()))).toContain("marker:m1");
  });

  it("edges only connect visible nodes", () => {
    const m = buildGraphModel(index, defaultFilters(), 1);

    const set = new Set(ids(m));

    expect(m.edges.every((e) => set.has(e.source) && set.has(e.target))).toBe(true);
  });
});

describe("sequence edges", () => {
  it("chains consecutive scene pages by order, skipping other page kinds and leaving counts alone", () => {
    const m = buildGraphModel(index, defaultFilters());

    expect(m.sequence).toEqual([{ id: "seq:s1>s2", source: "scene:s1", target: "scene:s2", count: 1, secret: false }]);
    expect(m.sequence.some((e) => e.source === "scene:h1" || e.target === "scene:h1")).toBe(false);
    expect(m.nodes.find((n) => n.id === "scene:s1")?.degree).toBe(4);
    expect(m.edges.some((e) => e.id.startsWith("seq:"))).toBe(false);
  });

  it("orders by `order`, not by input position", () => {
    const m = buildGraphModel({ ...index, scenes: [scene("s2", 2), scene("s1", 1)] }, defaultFilters());

    expect(m.sequence.map((e) => e.id)).toEqual(["seq:s1>s2"]);
  });

  it("skips scenes dropped by onlyMissing", () => {
    expect(buildGraphModel(index, { ...defaultFilters(), onlyMissing: true }).sequence).toEqual([]);
  });
});

describe("node ids", () => {
  it("prefixes ids", () => {
    expect(sceneNodeId("x")).toBe("scene:x");
    expect(entityNodeId("unit", "x")).toBe("unit:x");
  });
});

describe("neighbors", () => {
  it("returns the node, adjacent nodes and edges", () => {
    const m = buildGraphModel(index, defaultFilters());

    const n = neighbors(m, "unit:u1");

    expect([...n.nodes].sort()).toEqual(["scene:s1", "scene:s2", "unit:u1"]);
    expect([...n.edges].sort()).toEqual(["s1>unit:u1", "s2>unit:u1"]);
  });
});

describe("searchMatches", () => {
  const m = buildGraphModel(index, { ...defaultFilters(), showLeaves: true });

  it("matches Cyrillic case-insensitively by label", () => {
    expect(searchMatches(m, "ГОБ")).toEqual(["unit:u1"]);
    expect(searchMatches(m, "вогн")).toEqual(["spell:sp1"]);
  });
  it("returns nothing for empty or blank queries", () => {
    expect(searchMatches(m, "")).toEqual([]);
    expect(searchMatches(m, "   ")).toEqual([]);
  });
  it("matches only the label", () => {
    expect(searchMatches(m, "unit")).toEqual([]);
  });

  describe("forceInclude", () => {
    it("shows a collapsed leaf, but not one of an unticked type", () => {
      const force = new Set(["character:c1"]);

      expect(ids(buildGraphModel(index, defaultFilters(), undefined, force))).toContain("character:c1");

      const filters = { ...defaultFilters(), types: new Set<MentionType>(["unit"]) };

      expect(ids(buildGraphModel(index, filters, undefined, force))).not.toContain("character:c1");
    });

    it("bypasses the cap", () => {
      const m = buildGraphModel(index, defaultFilters(), 1, new Set(["marker:m1"]));

      expect(ids(m).filter((n) => !n.startsWith("scene:"))).toEqual(["unit:u1", "marker:m1"]);
      expect(m.truncated).toBe(2);
    });
  });

  it("reports the entity total so shown = total - truncated", () => {
    const m = buildGraphModel(index, defaultFilters(), 1);

    expect(m.entityTotal).toBe(6);
    expect(m.truncated).toBe(3);
  });
});
