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
    const xs = layoutGraph(model, 1, "timeline").nodes.filter((n) => n.kind === "scene").sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((n) => n.x);

    expect(xs).toEqual([...xs].sort((a, b) => a - b));
  });

  it("pins scenes on a timeline and keeps entities near their scenes", () => {
    const g = layoutGraph(model, 1, "timeline");

    const scenes = g.nodes.filter((n) => n.kind === "scene").sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    expect(scenes.map((n) => n.x)).toEqual([0, SCENE_STEP, SCENE_STEP * 2, SCENE_STEP * 3]);
    expect(g.nodes.filter((n) => n.kind === "entity").every((n) => n.x > -SCENE_STEP && n.x < SCENE_STEP * 4)).toBe(true);
  });

  it("free layout spreads scenes in 2D, deterministically", () => {
    const g = layoutGraph(model);

    const ys = g.nodes.filter((n) => n.kind === "scene").map((n) => n.y);

    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(150);
    expect(coords(layoutGraph(model))).toEqual(coords(g));
  });

  it("free layout keeps non-overlapping nodes and pulls hubs toward the center", () => {
    const hub = { ...entityNode(9), degree: 8 };

    const leaf = { ...entityNode(8), degree: 1 };

    const m: GraphModel = { ...model, nodes: [...model.nodes, hub, leaf], edges: [...model.edges, ...[1, 2, 3, 4].map((s) => link(s, 9)), link(1, 8)] };

    const g = layoutGraph(m);

    const dist = (id: string) => Math.hypot(...(() => { const n = g.nodes.find((x) => x.id === id)!;

 return [n.x, n.y]; })() as [number, number]);

    expect(dist("unit:e9")).toBeLessThan(dist("unit:e8"));

    const ids = g.nodes.length;

    const minGap = Math.min(...g.nodes.flatMap((a, i) => g.nodes.slice(i + 1).map((b) => Math.hypot(a.x - b.x, a.y - b.y))));

    expect(ids).toBe(m.nodes.length);
    expect(minGap).toBeGreaterThan(20);
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
