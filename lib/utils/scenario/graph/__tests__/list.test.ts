import { describe, expect, it } from "vitest";

import { buildGraphList } from "@/lib/utils/scenario/graph/list";
import { defaultFilters } from "@/lib/utils/scenario/graph/model";
import type { MentionType, ScenarioIndex } from "@/types/scenario";

const entity = (type: MentionType, id: string, label: string, sceneIds: string[], missing = false) => ({ kind: "entity" as const, type, id, label, degree: sceneIds.length, sceneIds, missing });

const index: ScenarioIndex = {
  scenes: [
    { kind: "scene", id: "b", title: "Forest", pageKind: "scene", status: "draft", order: 1, sections: [] },
    { kind: "scene", id: "a", title: "Tavern", pageKind: "scene", status: "draft", order: 0, sections: [] },
  ],
  entities: [{ ...entity("unit", "u1", "Wolf", ["a"]), image: "https://x/w.png" }, entity("unit", "u2", "Bear", ["a", "b"]), entity("spell", "s1", "Fireball", ["b"], true)],
  edges: [
    { sceneId: "a", entityType: "unit", entityId: "u1", count: 2, sectionIds: [], secret: false },
    { sceneId: "a", entityType: "unit", entityId: "u2", count: 1, sectionIds: [], secret: false },
    { sceneId: "b", entityType: "unit", entityId: "u2", count: 3, sectionIds: [], secret: false },
    { sceneId: "b", entityType: "spell", entityId: "s1", count: 1, sectionIds: [], secret: false },
  ],
  counts: { scenes: 2, entities: 3, edges: 4, byType: {}, missing: 1 },
};

describe("buildGraphList", () => {
  it("groups scenes by order, then entities by type sorted by degree, with mention counts", () => {
    const groups = buildGraphList(index, defaultFilters(), "");

    expect(groups.map((g) => g.key)).toEqual(["scenes", "unit", "spell"]);
    expect(groups[0]!.items.map((i) => i.id)).toEqual(["scene:a", "scene:b"]);
    expect(groups[1]!.items.map((i) => [i.id, i.degree, i.mentions])).toEqual([["unit:u2", 2, 4], ["unit:u1", 1, 2]]);
    expect(groups[0]!.items[0]).toMatchObject({ degree: 2, mentions: 3 });
  });

  it("carries the image to list items", () => {
    expect(buildGraphList(index, defaultFilters(), "").flatMap((g) => g.items).find((i) => i.id === "unit:u1")?.image).toBe("https://x/w.png");
  });

  it("includes single-link entities regardless of graph collapsing", () => {
    expect(buildGraphList(index, defaultFilters(), "").flatMap((g) => g.items).some((i) => i.id === "unit:u1")).toBe(true);
  });

  it("filters by type, query and onlyMissing", () => {
    const types = new Set<MentionType>(["spell"]);

    expect(buildGraphList(index, { ...defaultFilters(), types }, "").map((g) => g.key)).toEqual(["scenes", "spell"]);
    expect(buildGraphList(index, defaultFilters(), "wol").flatMap((g) => g.items.map((i) => i.id))).toEqual(["unit:u1"]);
    expect(buildGraphList(index, { ...defaultFilters(), onlyMissing: true }, "").flatMap((g) => g.items.map((i) => i.id))).toEqual(["scene:b", "spell:s1"]);
  });
});
