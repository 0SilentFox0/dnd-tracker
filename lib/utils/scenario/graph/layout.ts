import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, forceX, type SimulationLinkDatum, type SimulationNodeDatum } from "d3-force";

import { GRAPH_TICKS } from "@/lib/constants/scenario-graph";
import type { GraphEdge, GraphModel, GraphNode } from "@/lib/utils/scenario/graph/types";

export type PositionedNode = GraphNode & { x: number; y: number };

export interface PositionedGraph {
  nodes: PositionedNode[];
  edges: GraphEdge[];
  bounds: { minX: number; minY: number; w: number; h: number };
}

const SCENE_STEP = 260;

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

type SimNode = SimulationNodeDatum & GraphNode;

export function layoutGraph(model: GraphModel, seed = 1): PositionedGraph {
  if (model.nodes.length === 0) return { nodes: [], edges: model.edges, bounds: { minX: 0, minY: 0, w: 0, h: 0 } };

  const sim: SimNode[] = model.nodes.map((n, i) => {
    const r = 40 * Math.sqrt(i + 1);

    const a = (i + seed * 7) * GOLDEN_ANGLE;

    return { ...n, x: r * Math.cos(a), y: r * Math.sin(a) };
  });

  const links: SimulationLinkDatum<SimNode>[] = model.edges.map((e) => ({ source: e.source, target: e.target }));

  const simulation = forceSimulation(sim)
    .force("link", forceLink<SimNode, SimulationLinkDatum<SimNode>>(links).id((n) => n.id).distance(110).strength(0.3))
    .force("charge", forceManyBody().strength(-180))
    .force("collide", forceCollide(26))
    .force("center", forceCenter(0, 0))
    .force("sceneX", forceX<SimNode>((n) => (n.order ?? 0) * SCENE_STEP).strength((n) => (n.pageKind === "scene" ? 0.6 : 0)))
    .stop();

  for (let i = 0; i < GRAPH_TICKS; i++) simulation.tick();

  const nodes: PositionedNode[] = sim.map(({ x, y, vx: _vx, vy: _vy, fx: _fx, fy: _fy, index: _index, ...n }) => ({ ...n, x: x ?? 0, y: y ?? 0 }));

  const xs = nodes.map((n) => n.x);

  const ys = nodes.map((n) => n.y);

  const minX = Math.min(...xs);

  const minY = Math.min(...ys);

  return { nodes, edges: model.edges, bounds: { minX, minY, w: Math.max(...xs) - minX, h: Math.max(...ys) - minY } };
}
