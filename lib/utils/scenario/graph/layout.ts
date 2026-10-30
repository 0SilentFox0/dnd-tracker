import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationLinkDatum, type SimulationNodeDatum } from "d3-force";

import { GRAPH_MIN_TICKS, GRAPH_TICKS } from "@/lib/constants/scenario-graph";
import type { GraphEdge, GraphModel, GraphNode } from "@/lib/utils/scenario/graph/types";

export type PositionedNode = GraphNode & { x: number; y: number };

export interface PositionedGraph {
  nodes: PositionedNode[];
  edges: GraphEdge[];
  sequence: GraphEdge[];
  bounds: { minX: number; minY: number; w: number; h: number };
}

export const SCENE_STEP = 250;

const SIDE_ROW_Y = 330;

const WIGGLE = 46;

const BAND = 120;

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

type SimNode = SimulationNodeDatum & GraphNode;

function layoutTimeline(model: GraphModel, seed: number): PositionedGraph {

  const pageNodes = model.nodes.filter((n) => n.kind === "scene").sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const pinned = new Map<string, { x: number; y: number }>();

  let mainRank = 0;

  let sideRank = 0;

  for (const n of pageNodes) {
    if (n.pageKind === "scene") {
      pinned.set(n.id, { x: mainRank * SCENE_STEP, y: Math.sin(mainRank * 1.25 + seed) * WIGGLE });
      mainRank++;
    } else {
      pinned.set(n.id, { x: sideRank * SCENE_STEP * 0.8, y: SIDE_ROW_Y + (sideRank % 2) * 40 });
      sideRank++;
    }
  }

  const anchors = new Map<string, { x: number; y: number }[]>();

  for (const e of model.edges) {
    const at = pinned.get(e.source);

    if (at) anchors.set(e.target, [...(anchors.get(e.target) ?? []), at]);
  }

  const sim: SimNode[] = model.nodes.map((n, i) => {
    const fixed = pinned.get(n.id);

    if (fixed) return { ...n, x: fixed.x, y: fixed.y, fx: fixed.x, fy: fixed.y };

    const near = anchors.get(n.id) ?? [{ x: 0, y: 0 }];

    const cx = near.reduce((s, p) => s + p.x, 0) / near.length;

    const cy = near.reduce((s, p) => s + p.y, 0) / near.length;

    const a = (i + seed * 7) * GOLDEN_ANGLE;

    const r = 90 + (i % 5) * 18;

    return { ...n, x: cx + r * Math.cos(a), y: cy + (r + (n.degree > 1 ? 40 : 0)) * Math.sin(a) };
  });

  const links: SimulationLinkDatum<SimNode>[] = model.edges.map((e) => ({ source: e.source, target: e.target }));

  const simulation = forceSimulation(sim)
    .force("link", forceLink<SimNode, SimulationLinkDatum<SimNode>>(links).id((n) => n.id).distance(130).strength(0.18))
    .force("charge", forceManyBody<SimNode>().strength((n) => (n.kind === "scene" ? -120 : -160)))
    .force("band", forceY<SimNode>((n) => ((n.index ?? 0) % 2 === 0 ? -1 : 1) * (BAND + ((n.index ?? 0) % 4) * 75)).strength((n) => (n.kind === "scene" ? 0 : 0.3)))
    .force("collide", forceCollide<SimNode>((n) => (n.kind === "scene" ? 78 : 40)))
    .stop();

  for (let i = 0; i < ticksFor(model.nodes.length); i++) simulation.tick();

  return finish(model, sim);
}

export type GraphLayoutMode = "free" | "timeline";

function ticksFor(count: number) {
  return Math.max(GRAPH_MIN_TICKS, Math.min(GRAPH_TICKS, Math.round((GRAPH_TICKS * 150) / count)));
}

function finish(model: GraphModel, sim: SimNode[]): PositionedGraph {
  const nodes: PositionedNode[] = sim.map(({ x, y, vx: _vx, vy: _vy, fx: _fx, fy: _fy, index: _index, ...n }) => ({ ...n, x: x ?? 0, y: y ?? 0 }));

  const xs = nodes.map((n) => n.x);

  const ys = nodes.map((n) => n.y);

  const minX = Math.min(...xs);

  const minY = Math.min(...ys);

  return { nodes, edges: model.edges, sequence: model.sequence, bounds: { minX, minY, w: Math.max(...xs) - minX, h: Math.max(...ys) - minY } };
}

type SimLink = SimulationLinkDatum<SimNode> & { weak: boolean };

function layoutFree(model: GraphModel, seed: number): PositionedGraph {
  const scenes = model.nodes.filter((n) => n.kind === "scene").sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const home = new Map<string, { x: number; y: number }>();

  scenes.forEach((n, rank) => {
    const a = (rank + seed * 3) * GOLDEN_ANGLE;

    const r = 190 * Math.sqrt(rank + 0.5);

    home.set(n.id, { x: r * Math.cos(a), y: r * Math.sin(a) });
  });

  const anchors = new Map<string, { x: number; y: number }[]>();

  for (const e of model.edges) {
    const at = home.get(e.source);

    if (at) anchors.set(e.target, [...(anchors.get(e.target) ?? []), at]);
  }

  const sim: SimNode[] = model.nodes.map((n, i) => {
    const fixed = home.get(n.id);

    if (fixed) return { ...n, ...fixed };

    const near = anchors.get(n.id) ?? [{ x: 0, y: 0 }];

    const cx = near.reduce((s, p) => s + p.x, 0) / near.length;

    const cy = near.reduce((s, p) => s + p.y, 0) / near.length;

    const a = (i + seed * 7) * GOLDEN_ANGLE;

    const r = 110 + (i % 4) * 25;

    return { ...n, x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });

  const links: SimLink[] = [
    ...model.edges.map((e) => ({ source: e.source, target: e.target, weak: false })),
    ...model.sequence.map((e) => ({ source: e.source, target: e.target, weak: true })),
  ];

  const pull = (n: SimNode) => (n.kind === "scene" ? 0.05 : 0.025 + Math.min(n.degree, 8) * 0.03);

  const simulation = forceSimulation(sim)
    .force("link", forceLink<SimNode, SimLink>(links).id((n) => n.id).distance((l) => (l.weak ? 260 : 150)).strength((l) => (l.weak ? 0.1 : 0.35)))
    .force("charge", forceManyBody<SimNode>().strength((n) => (n.kind === "scene" ? -700 : -260)))
    .force("x", forceX<SimNode>(0).strength(pull))
    .force("y", forceY<SimNode>(0).strength(pull))
    .force("collide", forceCollide<SimNode>((n) => (n.kind === "scene" ? 86 : 34 + Math.min(n.degree, 8))))
    .stop();

  for (let i = 0; i < ticksFor(model.nodes.length); i++) simulation.tick();

  return finish(model, sim);
}

export function layoutGraph(model: GraphModel, seed = 1, mode: GraphLayoutMode = "free"): PositionedGraph {
  if (model.nodes.length === 0) return { nodes: [], edges: model.edges, sequence: model.sequence, bounds: { minX: 0, minY: 0, w: 0, h: 0 } };

  return mode === "timeline" ? layoutTimeline(model, seed) : layoutFree(model, seed);
}
