import { Lock } from "lucide-react";

import type { GraphEdge } from "@/lib/utils/scenario/graph/types";

export function GraphEdgeLine({ edge, from, to, dimmed, highlighted, secretLabel }: { edge: GraphEdge; from: { x: number; y: number }; to: { x: number; y: number }; dimmed: boolean; highlighted: boolean; secretLabel: string }) {
  const width = Math.min(1 + edge.count * 0.6, 5);

  const mx = (from.x + to.x) / 2;

  const my = (from.y + to.y) / 2;

  return (
    <g data-edge-id={edge.id} data-dimmed={dimmed ? "true" : undefined} style={{ opacity: dimmed ? 0.1 : highlighted ? 1 : 0.55 }} pointerEvents="none">
      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="currentColor" strokeWidth={width} strokeDasharray={edge.secret ? "6 4" : undefined} />
      {edge.secret ? (
        <g data-secret="true" transform={`translate(${mx - 7} ${my - 7})`}>
          <title>{secretLabel}</title>
          <rect width={14} height={14} rx={3} fill="var(--color-card)" />
          <Lock x={2} y={2} width={10} height={10} />
        </g>
      ) : null}
    </g>
  );
}
