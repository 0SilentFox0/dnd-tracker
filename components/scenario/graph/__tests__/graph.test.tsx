// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ScenarioGraph } from "@/components/scenario/graph";
import type { ScenarioIndex } from "@/types/scenario";

const push = vi.fn();

let index: ScenarioIndex | undefined;

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/hooks/scenario/useScenarioIndex", () => ({ useScenarioIndex: () => ({ data: index, isLoading: false, isError: false }) }));

const scene = (id: string, order: number) => ({ id, kind: "scene" as const, title: `Scene ${id}`, pageKind: "scene" as const, status: "draft" as const, order, sections: [] });

const FULL: ScenarioIndex = {
  scenes: [scene("a", 0), scene("b", 1)],
  entities: [
    { kind: "entity", type: "unit", id: "g", label: "Goblin", degree: 2, sceneIds: ["a", "b"], missing: false },
    { kind: "entity", type: "artifact", id: "o", label: "Orb", degree: 1, sceneIds: ["a"], missing: true },
    { kind: "entity", type: "spell", id: "s", label: "Spark", degree: 1, sceneIds: ["a"], missing: false },
  ],
  edges: [
    { sceneId: "a", entityType: "unit", entityId: "g", count: 1, sectionIds: [], secret: false },
    { sceneId: "b", entityType: "unit", entityId: "g", count: 2, sectionIds: [], secret: true },
    { sceneId: "a", entityType: "artifact", entityId: "o", count: 1, sectionIds: [], secret: false },
    { sceneId: "a", entityType: "spell", entityId: "s", count: 1, sectionIds: [], secret: false },
  ],
  counts: { scenes: 2, entities: 3, edges: 4, byType: { unit: 1, artifact: 1, spell: 1 }, missing: 1 },
};

const node = (id: string) => document.querySelector(`[data-node-id="${id}"]`) as SVGGElement;

describe("ScenarioGraph", () => {
  beforeEach(() => {
    index = FULL;
    push.mockClear();
  });
  afterEach(cleanup);

  it("renders nodes and edges, hiding single-link entities behind a +N badge", () => {
    render(<ScenarioGraph campaignId="c" />);

    expect(document.querySelectorAll("[data-node-id]")).toHaveLength(4);
    expect(document.querySelectorAll("[data-edge-id]")).toHaveLength(3);
    expect(screen.getByText("+1")).toBeInTheDocument();
  });

  it("marks missing nodes and secret edges", () => {
    render(<ScenarioGraph campaignId="c" />);

    expect(node("artifact:o")).toHaveAttribute("data-missing", "true");
    expect(node("unit:g")).not.toHaveAttribute("data-missing");
    expect(document.querySelectorAll("[data-secret]")).toHaveLength(1);
  });

  it("selects on click and dims unrelated nodes", () => {
    render(<ScenarioGraph campaignId="c" />);

    fireEvent.click(node("scene:b"));

    expect(node("scene:b")).toHaveClass("graph-node-selected");
    expect(node("unit:g")).not.toHaveAttribute("data-dimmed");
    expect(node("scene:a")).toHaveAttribute("data-dimmed", "true");
    expect(node("artifact:o")).toHaveAttribute("data-dimmed", "true");
  });

  it("selects on Enter and clears on Escape", () => {
    render(<ScenarioGraph campaignId="c" />);

    expect(node("unit:g")).toHaveAttribute("tabindex", "0");

    fireEvent.keyDown(node("unit:g"), { key: "Enter" });
    expect(node("unit:g")).toHaveClass("graph-node-selected");

    fireEvent.keyDown(node("unit:g"), { key: "Escape" });
    expect(node("unit:g")).not.toHaveClass("graph-node-selected");
  });

  it("opens a page from the inspector", () => {
    render(<ScenarioGraph campaignId="c" />);

    fireEvent.click(node("scene:a"));
    fireEvent.click(screen.getByRole("button", { name: "scenarioGraph.inspector.open" }));

    expect(push).toHaveBeenCalledWith("/campaigns/c/dm/scenario/a");
  });

  it("opens an entity on double click", () => {
    render(<ScenarioGraph campaignId="c" />);

    fireEvent.doubleClick(node("unit:g"));

    expect(push).toHaveBeenCalledWith("/campaigns/c/dm/units/g");
  });

  it("disables open for a missing entity", () => {
    render(<ScenarioGraph campaignId="c" />);

    fireEvent.click(node("artifact:o"));

    expect(screen.getByRole("button", { name: "scenarioGraph.inspector.open" })).toBeDisabled();
    expect(screen.getByText("scenarioGraph.inspector.missingHint")).toBeInTheDocument();

    fireEvent.doubleClick(node("artifact:o"));
    expect(push).not.toHaveBeenCalled();
  });

  it("shows the empty state with a link when there are no pages", () => {
    index = { scenes: [], entities: [], edges: [], counts: { scenes: 0, entities: 0, edges: 0, byType: {}, missing: 0 } };
    render(<ScenarioGraph campaignId="c" />);

    expect(screen.getByText("scenarioGraph.empty.noPages")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "scenarioGraph.empty.noPagesAction" })).toHaveAttribute("href", "/campaigns/c/dm/scenario");
  });

  it("hints to insert mentions when pages have none", () => {
    index = { scenes: [scene("a", 0)], entities: [], edges: [], counts: { scenes: 1, entities: 0, edges: 0, byType: {}, missing: 0 } };
    render(<ScenarioGraph campaignId="c" />);

    expect(screen.getByText("scenarioGraph.empty.noMentions")).toBeInTheDocument();
  });

  it("offers to reset filters when everything is filtered out", () => {
    render(<ScenarioGraph campaignId="c" />);

    fireEvent.click(screen.getByRole("checkbox", { name: /scenarioGraph.toolbar.onlyMissing/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /scenarioGraph.toolbar.onlyMissing/ }));
    expect(document.querySelectorAll("[data-node-id]").length).toBeGreaterThan(0);

    index = { ...FULL, entities: FULL.entities.slice(0, 1), edges: FULL.edges.slice(0, 1) };
    cleanup();
    render(<ScenarioGraph campaignId="c" />);
    fireEvent.click(screen.getByRole("checkbox", { name: /scenarioGraph.toolbar.onlyMissing/ }));

    expect(screen.getByText("scenarioGraph.empty.filtered")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "scenarioGraph.empty.resetFilters" }));
    expect(document.querySelectorAll("[data-node-id]").length).toBeGreaterThan(0);
  });

  it("search Enter selects the first match", () => {
    render(<ScenarioGraph campaignId="c" />);

    const input = screen.getByRole("searchbox");

    fireEvent.change(input, { target: { value: "gob" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(node("unit:g")).toHaveClass("graph-node-selected");
  });
});
