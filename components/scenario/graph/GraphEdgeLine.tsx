import { memo } from "react";
import { Lock } from "lucide-react";

import { GRAPH_SCENE_W } from "@/lib/constants/scenario-graph";
import type { GraphEdge } from "@/lib/utils/scenario/graph/types";

export const SEQUENCE_MARKER_ID = "graph-seq-arrow";

interface Point {
  x: number;
  y: number;
}

interface GraphEdgeLineProps {
  edge: GraphEdge;
  from: Point;
  to: Point;
  color: string;
  sequence?: boolean;
  dimmed: boolean;
  highlighted: boolean;
  secretLabel: string;
}

function curve(a: Point, b: Point, bend: number) {
  const mx = (a.x + b.x) / 2;

  const my = (a.y + b.y) / 2;

  const cx = mx - (b.y - a.y) * bend;

  const cy = my + (b.x - a.x) * bend;

  return { d: `M${a.x} ${a.y} Q${cx} ${cy} ${b.x} ${b.y}`, x: 0.25 * a.x + 0.5 * cx + 0.25 * b.x, y: 0.25 * a.y + 0.5 * cy + 0.25 * b.y };
}

function GraphEdgeLineImpl({ edge, from, to, color, sequence = false, dimmed, highlighted, secretLabel }: GraphEdgeLineProps) {
  if (sequence) {
    const half = GRAPH_SCENE_W / 2;

    const { d } = curve({ x: from.x + half, y: from.y }, { x: to.x - half - 6, y: to.y }, -0.12);

    return (
      <g data-edge-id={edge.id} data-sequence="true" data-dimmed={dimmed ? "true" : undefined} style={{ opacity: dimmed ? 0.12 : 0.8 }} pointerEvents="none">
        <path d={d} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" markerEnd={`url(#${SEQUENCE_MARKER_ID})`} />
      </g>
    );
  }

  const width = Math.min(1 + (edge.count - 1) * 0.5, 2.5);

  const { d, x, y } = curve(from, to, 0.14);

  return (
    <g data-edge-id={edge.id} data-dimmed={dimmed ? "true" : undefined} style={{ opacity: dimmed ? 0.03 : highlighted ? 0.95 : 0.28 }} pointerEvents="none">
      <path d={d} fill="none" stroke={color} strokeWidth={highlighted ? width + 1.2 : width} strokeLinecap="round" strokeDasharray={edge.secret ? "6 4" : undefined} />
      {edge.secret ? (
        <g data-secret="true" transform={`translate(${x - 8} ${y - 8})`}>
          <title>{secretLabel}</title>
          <circle cx={8} cy={8} r={9} fill="var(--card)" stroke={color} />
          <Lock x={3.5} y={3.5} width={9} height={9} />
        </g>
      ) : null}
    </g>
  );
}

export const GraphEdgeLine = memo(GraphEdgeLineImpl);
