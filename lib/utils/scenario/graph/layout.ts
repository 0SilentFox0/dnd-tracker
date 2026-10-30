import { forceCollide, forceLink, forceManyBody, forceSimulation, forceY, type SimulationLinkDatum, type SimulationNodeDatum } from "d3-force";

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

export function layoutGraph(model: GraphModel, seed = 1): PositionedGraph {
  if (model.nodes.length === 0) return { nodes: [], edges: model.edges, sequence: model.sequence, bounds: { minX: 0, minY: 0, w: 0, h: 0 } };

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

  const ticks = Math.max(GRAPH_MIN_TICKS, Math.min(GRAPH_TICKS, Math.round((GRAPH_TICKS * 150) / model.nodes.length)));

  for (let i = 0; i < ticks; i++) simulation.tick();

  const nodes: PositionedNode[] = sim.map(({ x, y, vx: _vx, vy: _vy, fx: _fx, fy: _fy, index: _index, ...n }) => ({ ...n, x: x ?? 0, y: y ?? 0 }));

  const xs = nodes.map((n) => n.x);

  const ys = nodes.map((n) => n.y);

  const minX = Math.min(...xs);

  const minY = Math.min(...ys);

  return { nodes, edges: model.edges, sequence: model.sequence, bounds: { minX, minY, w: Math.max(...xs) - minX, h: Math.max(...ys) - minY } };
}
