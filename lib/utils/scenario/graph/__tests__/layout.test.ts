import { describe, expect, it } from "vitest";

import { layoutGraph, SCENE_STEP } from "@/lib/utils/scenario/graph/layout";
import type { GraphEdge, GraphModel, GraphNode } from "@/lib/utils/scenario/graph/types";

const sceneNode = (i: number): GraphNode => ({
  id: `scene:s${i}`, kind: "scene", pageKind: "scene", label: `s${i}`, degree: 2, missing: false, order: i, refId: `s${i}`, hidden: 0,
});

const entityNode = (i: number): GraphNode => ({
  id: `unit:e${i}`, kind: "entity", type: "unit", label: `e${i}`, degree: 2, missing: false, refId: `e${i}`, hidden: 0,
});

const link = (s: number, e: number): GraphEdge => ({ id: `s${s}>unit:e${e}`, source: `scene:s${s}`, target: `unit:e${e}`, count: 1, secret: false });

const model: GraphModel = {
  nodes: [sceneNode(1), sceneNode(2), sceneNode(3), sceneNode(4), entityNode(1), entityNode(2), entityNode(3)],
  edges: [link(1, 1), link(2, 1), link(2, 2), link(3, 2), link(3, 3), link(4, 3)],
  sequence: [],
  truncated: 0,
  entityTotal: 0,
};

const coords = (g: ReturnType<typeof layoutGraph>) => g.nodes.map((n) => [n.x, n.y]);

describe("layoutGraph", () => {
  it("is deterministic for the same model and seed", () => {
    expect(coords(layoutGraph(model, 1))).toEqual(coords(layoutGraph(model, 1)));
  });

  it("produces finite coordinates", () => {
    const g = layoutGraph(model);

    expect(g.nodes.every((n) => Number.isFinite(n.x) && Number.isFinite(n.y))).toBe(true);
  });

  it("handles an empty model", () => {
    expect(layoutGraph({ nodes: [], edges: [], sequence: [], truncated: 0, entityTotal: 0 })).toEqual({ nodes: [], edges: [], sequence: [], bounds: { minX: 0, minY: 0, w: 0, h: 0 } });
  });

  it("orders scenes along x by order", () => {
    const xs = layoutGraph(model).nodes.filter((n) => n.kind === "scene").sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((n) => n.x);

    expect(xs).toEqual([...xs].sort((a, b) => a - b));
  });

  it("pins scenes on a timeline and keeps entities near their scenes", () => {
    const g = layoutGraph(model);

    const scenes = g.nodes.filter((n) => n.kind === "scene").sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    expect(scenes.map((n) => n.x)).toEqual([0, SCENE_STEP, SCENE_STEP * 2, SCENE_STEP * 3]);
    expect(g.nodes.filter((n) => n.kind === "entity").every((n) => n.x > -SCENE_STEP && n.x < SCENE_STEP * 4)).toBe(true);
  });

  it("gives different coordinates for a different seed", () => {
    expect(coords(layoutGraph(model, 1))).not.toEqual(coords(layoutGraph(model, 2)));
  });

  it("bounds cover all nodes", () => {
    const g = layoutGraph(model);

    const { minX, minY, w, h } = g.bounds;

    expect(g.nodes.every((n) => n.x >= minX && n.x <= minX + w && n.y >= minY && n.y <= minY + h)).toBe(true);
  });

  it("does not mutate the input model", () => {
    const before = JSON.stringify(model);

    layoutGraph(model);
    expect(JSON.stringify(model)).toBe(before);
  });
});
