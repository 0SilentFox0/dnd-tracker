// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ScenarioGraph } from "@/components/scenario/graph";
import type { ScenarioIndex } from "@/types/scenario";

const push = vi.fn();

let index: ScenarioIndex | undefined;

let isError = false;

const refetch = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/hooks/scenario/useScenarioIndex", () => ({ useScenarioIndex: () => ({ data: index, isLoading: false, isError, refetch }) }));

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
    isError = false;
    push.mockClear();
    refetch.mockClear();
  });
  afterEach(cleanup);

  it("renders nodes and edges, hiding single-link entities behind a +N badge", () => {
    render(<ScenarioGraph campaignId="c" />);

    expect(document.querySelectorAll("[data-node-id]")).toHaveLength(4);
    expect(document.querySelectorAll("[data-edge-id]:not([data-sequence])")).toHaveLength(3);
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
    expect(screen.getByRole("link", { name: "scenarioGraph.empty.noPagesAction" })).toHaveAttribute("href", "/campaigns/c/dm/scenario");
    expect(node("scene:a")).not.toBeNull();
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

  it("draws the story thread between scenes and toggles it from the toolbar", () => {
    render(<ScenarioGraph campaignId="c" />);

    expect(document.querySelectorAll("[data-sequence]")).toHaveLength(1);
    expect(document.querySelectorAll("[data-edge-id]")).toHaveLength(4);

    fireEvent.click(screen.getByRole("checkbox", { name: /scenarioGraph.toolbar.showSequence/ }));

    expect(document.querySelectorAll("[data-sequence]")).toHaveLength(0);
  });

  it("selects the first match while typing, without Enter", () => {
    render(<ScenarioGraph campaignId="c" />);

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "spark" } });

    expect(node("spell:s")).toHaveClass("graph-node-selected");
  });

  it("clears the selection on Escape pressed anywhere", () => {
    render(<ScenarioGraph campaignId="c" />);

    fireEvent.click(node("unit:g"));
    expect(node("unit:g")).toHaveClass("graph-node-selected");

    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(node("unit:g")).not.toHaveClass("graph-node-selected");
  });

  it("lists pages and entities, including collapsed ones, and selects on click", () => {
    render(<ScenarioGraph campaignId="c" />);

    const item = (id: string) => document.querySelector(`[data-list-id="${id}"]`) as HTMLElement;

    expect(item("scene:a")).not.toBeNull();
    expect(item("spell:s")).not.toBeNull();
    expect(node("spell:s")).toBeNull();

    fireEvent.click(item("spell:s"));

    expect(node("spell:s")).toHaveClass("graph-node-selected");
    expect(item("spell:s")).toHaveAttribute("aria-current", "true");
  });

  it("filters the list by type filters and by its search box", () => {
    render(<ScenarioGraph campaignId="c" />);

    fireEvent.change(screen.getByRole("textbox", { name: "scenarioGraph.list.search" }), { target: { value: "orb" } });

    expect([...document.querySelectorAll("[data-list-id]")].map((e) => e.getAttribute("data-list-id"))).toEqual(["artifact:o"]);
  });

  it("shows only neighbors in focus mode and leaves it on Escape", () => {
    render(<ScenarioGraph campaignId="c" />);

    fireEvent.click(node("unit:g"));
    fireEvent.click(screen.getByRole("button", { name: "scenarioGraph.inspector.focusOn" }));

    expect(node("artifact:o")).toBeNull();
    expect(node("scene:a")).not.toBeNull();

    fireEvent.keyDown(document.body, { key: "Escape" });

    expect(node("artifact:o")).not.toBeNull();
  });

  it("selects on Space", () => {
    render(<ScenarioGraph campaignId="c" />);

    fireEvent.keyDown(node("unit:g"), { key: " " });
    expect(node("unit:g")).toHaveClass("graph-node-selected");
  });

  it("keeps the graph in place when the inspector opens", () => {
    render(<ScenarioGraph campaignId="c" />);

    const before = document.querySelector("svg")?.getAttribute("viewBox");

    fireEvent.click(node("unit:g"));

    const inspector = document.querySelector('aside[aria-label="scenarioGraph.inspector.title"]');

    expect(inspector).not.toBeNull();
    expect(inspector?.className).toContain("absolute");
    expect(document.querySelector("svg")?.getAttribute("viewBox")).toBe(before);
  });

  it("search Enter selects the first match", () => {
    render(<ScenarioGraph campaignId="c" />);

    const input = screen.getByRole("searchbox");

    fireEvent.change(input, { target: { value: "gob" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(node("unit:g")).toHaveClass("graph-node-selected");
  });

  it("shows a visible broken marker on missing nodes only", () => {
    render(<ScenarioGraph campaignId="c" />);

    expect(node("artifact:o").querySelector("[data-broken-marker]")).not.toBeNull();
    expect(node("unit:g").querySelector("[data-broken-marker]")).toBeNull();
  });

  it("gives the +N badge accessible text", () => {
    render(<ScenarioGraph campaignId="c" />);

    expect(node("scene:a").querySelector("g > g > title")?.textContent).toBe('scenarioGraph.graph.hidden {"count":1}');
  });

  it("retries after an error", () => {
    isError = true;
    render(<ScenarioGraph campaignId="c" />);

    fireEvent.click(screen.getByRole("button", { name: "common.states.retry" }));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("finds a collapsed single-page entity by search", () => {
    render(<ScenarioGraph campaignId="c" />);

    expect(node("spell:s")).toBeNull();

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "spark" } });

    expect(node("spell:s")).not.toBeNull();
  });

  describe("limits", () => {
    const many = (n: number): ScenarioIndex => {
      const entities = Array.from({ length: n }, (_, i) => ({ kind: "entity" as const, type: "unit" as const, id: `u${i}`, label: `Unit ${i}`, degree: 2, sceneIds: ["a", "b"], missing: false }));

      return {
        scenes: [scene("a", 0), scene("b", 1)],
        entities,
        edges: entities.flatMap((e) => ["a", "b"].map((sceneId) => ({ sceneId, entityType: "unit" as const, entityId: e.id, count: 1, sectionIds: [], secret: false }))),
        counts: { scenes: 2, entities: n, edges: n * 2, byType: { unit: n }, missing: 0 },
      };
    };

    it("shows the truncated banner and expands with show all", () => {
      index = many(160);
      render(<ScenarioGraph campaignId="c" />);

      expect(screen.getByText(/scenarioGraph.limits.truncated \{"shown":150,"total":160\}/)).toBeInTheDocument();
      expect(document.querySelectorAll("[data-node-id]")).toHaveLength(152);

      fireEvent.click(screen.getByRole("button", { name: "scenarioGraph.limits.showAll" }));

      expect(screen.queryByText(/scenarioGraph.limits.truncated/)).toBeNull();
      expect(document.querySelectorAll("[data-node-id]")).toHaveLength(162);
    });

    it("warns when the graph is over the limit", () => {
      index = many(405);
      render(<ScenarioGraph campaignId="c" />);

      expect(screen.queryByText("scenarioGraph.limits.overLimit")).toBeNull();

      fireEvent.click(screen.getByRole("button", { name: "scenarioGraph.limits.showAll" }));

      expect(screen.getByText("scenarioGraph.limits.overLimit")).toBeInTheDocument();
    });
  });

  describe("pointer interaction", () => {
    const svg = () => screen.getByRole("group", { name: "scenarioGraph.graph.label" });

    const move = (el: Element, init: PointerEventInit) => fireEvent.pointerMove(el, { pointerId: 1, pointerType: "mouse", ...init });

    it("a drag suppresses the click on a node", () => {
      render(<ScenarioGraph campaignId="c" />);

      fireEvent.pointerDown(svg(), { pointerId: 1, pointerType: "mouse", clientX: 10, clientY: 10, buttons: 1 });
      move(svg(), { clientX: 60, clientY: 10, buttons: 1 });
      fireEvent.pointerUp(svg(), { pointerId: 1, pointerType: "mouse" });
      fireEvent.click(node("unit:g"));

      expect(node("unit:g")).not.toHaveClass("graph-node-selected");

      fireEvent.click(node("unit:g"));

      expect(node("unit:g")).toHaveClass("graph-node-selected");
    });

    it("a mouse move without buttons does not pan", () => {
      render(<ScenarioGraph campaignId="c" />);

      const before = svg().getAttribute("viewBox");

      fireEvent.pointerDown(svg(), { pointerId: 1, pointerType: "mouse", clientX: 10, clientY: 10, buttons: 1 });
      move(svg(), { clientX: 200, clientY: 10, buttons: 0 });
      move(svg(), { clientX: 300, clientY: 10, buttons: 0 });

      expect(svg().getAttribute("viewBox")).toBe(before);
    });
  });
});
