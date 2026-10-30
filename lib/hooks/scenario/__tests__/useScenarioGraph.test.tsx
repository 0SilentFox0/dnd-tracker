// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as scenarioApi from "@/lib/api/scenario";
import { useScenarioGraph } from "@/lib/hooks/scenario";
import type { ScenarioIndex } from "@/types/scenario";

vi.mock("@/lib/api/scenario", () => ({ getScenarioIndex: vi.fn() }));

const scene = (id: string, title: string, order: number) => ({
  kind: "scene" as const,
  id,
  title,
  pageKind: "scene" as const,
  status: "draft" as const,
  order,
  sections: [],
});

const entity = (type: "unit" | "character", id: string, label: string, sceneIds: string[]) => ({
  kind: "entity" as const,
  type,
  id,
  label,
  degree: sceneIds.length,
  sceneIds,
  missing: false,
});

const edge = (sceneId: string, entityType: "unit" | "character", entityId: string, secret = false) => ({ sceneId, entityType, entityId, count: 2, sectionIds: [], secret });

const index: ScenarioIndex = {
  scenes: [scene("s1", "Таверна", 0), scene("s2", "Ліс", 1)],
  entities: [entity("unit", "u1", "Вовк", ["s1", "s2"]), entity("character", "c1", "Вовкулака", ["s1", "s2"])],
  edges: [edge("s1", "unit", "u1"), edge("s2", "unit", "u1", true), edge("s1", "character", "c1"), edge("s2", "character", "c1")],
  counts: { scenes: 2, entities: 2, edges: 4, byType: { unit: 1, character: 1 }, missing: 0 },
};

const empty: ScenarioIndex = { scenes: [], entities: [], edges: [], counts: { scenes: 0, entities: 0, edges: 0, byType: {}, missing: 0 } };

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

  return renderHook(() => useScenarioGraph("c"), { wrapper });
}

describe("useScenarioGraph", () => {
  beforeEach(() => {
    vi.mocked(scenarioApi.getScenarioIndex).mockReset();
  });

  it("loads the index into a positioned graph", async () => {
    vi.mocked(scenarioApi.getScenarioIndex).mockResolvedValue(index);

    const { result } = setup();

    expect(result.current.state.isLoading).toBe(true);
    await waitFor(() => expect(result.current.state.graph).not.toBeNull());
    expect(result.current.state.graph?.nodes).toHaveLength(4);
    expect(result.current.state.isEmpty).toBe(false);
    expect(result.current.state.overLimit).toBe(false);
    expect(result.current.state.counts?.scenes).toBe(2);
  });

  it("flags an index without pages as empty", async () => {
    vi.mocked(scenarioApi.getScenarioIndex).mockResolvedValue(empty);

    const { result } = setup();

    await waitFor(() => expect(result.current.state.isLoading).toBe(false));
    expect(result.current.state.isEmpty).toBe(true);
  });

  it("reports errors", async () => {
    vi.mocked(scenarioApi.getScenarioIndex).mockRejectedValue(new Error("boom"));

    const { result } = setup();

    await waitFor(() => expect(result.current.state.isError).toBe(true));
    expect(result.current.state.graph).toBeNull();
  });

  it("filters nodes by type", async () => {
    vi.mocked(scenarioApi.getScenarioIndex).mockResolvedValue(index);

    const { result } = setup();

    await waitFor(() => expect(result.current.state.graph).not.toBeNull());
    act(() => result.current.set.filters({ types: new Set(["unit"]) }));
    expect(result.current.state.graph?.nodes.map((n) => n.id).sort()).toEqual(["scene:s1", "scene:s2", "unit:u1"]);
    expect(result.current.state.filters.showAll).toBe(false);
  });

  it("selection exposes neighbors and detail links without relayout", async () => {
    vi.mocked(scenarioApi.getScenarioIndex).mockResolvedValue(index);

    const { result } = setup();

    await waitFor(() => expect(result.current.state.graph).not.toBeNull());

    const before = result.current.state.graph;

    expect(result.current.selection.detail).toBeNull();
    act(() => result.current.set.selected("unit:u1"));
    expect(result.current.state.selectedId).toBe("unit:u1");
    expect([...result.current.selection.nodes].sort()).toEqual(["scene:s1", "scene:s2", "unit:u1"]);
    expect(result.current.selection.edges.size).toBe(2);

    const detail = result.current.selection.detail;

    expect(detail?.node.id).toBe("unit:u1");
    expect(detail?.links.map((l) => [l.node.id, l.count, l.secret]).sort()).toEqual([
      ["scene:s1", 2, false],
      ["scene:s2", 2, true],
    ]);
    act(() => result.current.set.query("лі"));
    expect(result.current.state.graph).toBe(before);
    act(() => result.current.set.selected(null));
    expect(result.current.state.graph).toBe(before);
    expect(result.current.selection.detail).toBeNull();
  });

  it("searches and cycles through matches", async () => {
    vi.mocked(scenarioApi.getScenarioIndex).mockResolvedValue(index);

    const { result } = setup();

    await waitFor(() => expect(result.current.state.graph).not.toBeNull());
    act(() => result.current.set.query("вовк"));
    expect(result.current.state.matches).toEqual(["unit:u1", "character:c1"]);
    expect(result.current.state.matchIndex).toBe(0);
    act(() => result.current.set.nextMatch());
    expect(result.current.state.selectedId).toBe("unit:u1");
    act(() => result.current.set.nextMatch());
    expect(result.current.state.selectedId).toBe("character:c1");
    expect(result.current.state.matchIndex).toBe(1);
    act(() => result.current.set.nextMatch());
    expect(result.current.state.selectedId).toBe("unit:u1");
    expect(result.current.state.matchIndex).toBe(0);
  });

  it("finds a single-page entity by search with default filters", async () => {
    vi.mocked(scenarioApi.getScenarioIndex).mockResolvedValue({
      ...index,
      entities: [...index.entities, entity("unit", "u9", "Тролль", ["s1"])],
      edges: [...index.edges, edge("s1", "unit", "u9")],
    });

    const { result } = setup();

    await waitFor(() => expect(result.current.state.graph).not.toBeNull());
    expect(result.current.state.graph?.nodes.some((n) => n.id === "unit:u9")).toBe(false);
    act(() => result.current.set.query("тролль"));
    expect(result.current.state.matches).toEqual(["unit:u9"]);
    act(() => result.current.set.nextMatch());
    expect(result.current.state.selectedId).toBe("unit:u9");
    act(() => result.current.set.query(""));
    expect(result.current.state.graph?.nodes.some((n) => n.id === "unit:u9")).toBe(false);
  });

  it("drops a selection whose node left the graph", async () => {
    vi.mocked(scenarioApi.getScenarioIndex).mockResolvedValue(index);

    const { result } = setup();

    await waitFor(() => expect(result.current.state.graph).not.toBeNull());
    act(() => result.current.set.selected("unit:u1"));
    expect(result.current.state.selectedId).toBe("unit:u1");
    act(() => result.current.set.filters({ types: new Set(["character"]) }));
    expect(result.current.state.selectedId).toBeNull();
    expect(result.current.selection.detail).toBeNull();
    expect(result.current.selection.nodes.size).toBe(0);
  });

  it("retry refetches the index", async () => {
    vi.mocked(scenarioApi.getScenarioIndex).mockRejectedValue(new Error("boom"));

    const { result } = setup();

    await waitFor(() => expect(result.current.state.isError).toBe(true));
    vi.mocked(scenarioApi.getScenarioIndex).mockResolvedValue(index);
    act(() => result.current.set.retry());
    await waitFor(() => expect(result.current.state.graph).not.toBeNull());
  });
});
