import { describe, expect, it } from "vitest";

import { buildScenarioIndex, entityKey } from "@/lib/utils/scenario/index/build";
import type { IndexRef, PageFacts, ScenarioPageSummary } from "@/types/scenario";

const page = (id: string, sortOrder: number, title = id): ScenarioPageSummary => ({
  id,
  kind: "scene",
  arc: null,
  title,
  subtitle: null,
  status: "draft",
  sortOrder,
  characterId: null,
  version: 1,
  updatedAt: "2026-01-01T00:00:00.000Z",
}) as ScenarioPageSummary;

const ref = (type: IndexRef["type"], id: string, extra: Partial<IndexRef> = {}): IndexRef => ({ type, id, label: "", count: 1, secret: false, ...extra });

const facts = (...sections: { id: string; refs: IndexRef[] }[]): PageFacts => ({ sections: sections.map((s) => ({ title: s.id, played: false, ...s })) });

describe("buildScenarioIndex", () => {
  it("returns an empty index for an empty campaign", () => {
    expect(buildScenarioIndex({ pages: [], facts: new Map(), resolved: new Map() })).toEqual({
      scenes: [],
      entities: [],
      edges: [],
      counts: { scenes: 0, entities: 0, edges: 0, byType: {}, missing: 0 },
    });
  });

  it("orders scenes by sortOrder and copies sections without refs", () => {
    const index = buildScenarioIndex({
      pages: [page("a", 2), page("b", 1), page("c", 3)],
      facts: new Map([["a", facts({ id: "s1", refs: [ref("unit", "u1")] })]]),
      resolved: new Map(),
    });

    expect(index.scenes.map((s) => [s.id, s.order])).toEqual([["b", 0], ["a", 1], ["c", 2]]);
    expect(index.scenes[1].sections).toEqual([{ id: "s1", title: "s1", played: false }]);
    expect(index.scenes[0].sections).toEqual([]);
  });

  it("aggregates edges per scene/entity and entities across scenes", () => {
    const index = buildScenarioIndex({
      pages: [page("a", 1), page("b", 2)],
      facts: new Map([
        ["a", facts({ id: "s1", refs: [ref("unit", "u1", { count: 2, secret: true })] }, { id: "s2", refs: [ref("unit", "u1", { count: 1, secret: true })] })],
        ["b", facts({ id: "s1", refs: [ref("unit", "u1")] })],
      ]),
      resolved: new Map(),
    });

    expect(index.entities).toHaveLength(1);
    expect(index.entities[0]).toMatchObject({ degree: 2, sceneIds: ["a", "b"] });
    expect(index.edges).toEqual([
      { sceneId: "a", entityType: "unit", entityId: "u1", count: 3, sectionIds: ["s1", "s2"], secret: true },
      { sceneId: "b", entityType: "unit", entityId: "u1", count: 1, sectionIds: ["s1"], secret: false },
    ]);
  });

  it("sorts entities by degree, label, id and is order-independent", () => {
    const f = new Map([
      ["a", facts({ id: "s", refs: [ref("unit", "u2", { label: "Beta" }), ref("unit", "u1", { label: "Alpha" }), ref("spell", "sp", { label: "Zap" })] })],
      ["b", facts({ id: "s", refs: [ref("spell", "sp", { label: "Zap" })] })],
    ]);

    const input = { pages: [page("a", 1), page("b", 2)], facts: f, resolved: new Map() };

    const index = buildScenarioIndex(input);

    expect(index.entities.map((e) => e.id)).toEqual(["sp", "u1", "u2"]);
    expect(buildScenarioIndex({ ...input, pages: [...input.pages].reverse(), facts: new Map([...f].reverse()) })).toEqual(index);
  });

  it("resolves labels, flags missing entities and counts them", () => {
    const index = buildScenarioIndex({
      pages: [page("a", 1)],
      facts: new Map([["a", facts({ id: "s", refs: [ref("unit", "u1", { label: "Chip" }), ref("spell", "gone", { label: "Old" }), ref("battle", "b1")] })]]),
      resolved: new Map<string, { label: string; image?: string | null }>([[entityKey("unit", "u1"), { label: "Real", image: "https://x/u.png" }], [entityKey("battle", "b1"), { label: "Fight" }]]),
    });

    const byId = Object.fromEntries(index.entities.map((e) => [e.id, e]));

    expect(byId.u1).toMatchObject({ label: "Real", missing: false, image: "https://x/u.png" });
    expect(byId.b1?.image).toBeNull();
    expect(byId.gone?.image).toBeNull();
    expect(byId.gone).toMatchObject({ label: "Old", missing: true });
    expect(index.counts).toEqual({ scenes: 1, entities: 3, edges: 3, byType: { unit: 1, spell: 1, battle: 1 }, missing: 1 });
  });
});
