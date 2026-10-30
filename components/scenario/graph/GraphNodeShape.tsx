"use client";

import { useState } from "react";

import { GRAPH_LABEL_MIN_DEGREE, GRAPH_TYPE_STYLE } from "@/lib/constants/scenario-graph";
import type { PositionedNode } from "@/lib/utils/scenario/graph/layout";

const STATUS_COLOR = { draft: "var(--color-hud-gold-bright)", ready: "var(--color-hud-good)", personal: "var(--color-chart-2)" } as const;

const LABEL_MAX = 26;

export interface GraphNodeShapeProps {
  node: PositionedNode;
  selected: boolean;
  dimmed: boolean;
  matched: boolean;
  onSelect: (id: string) => void;
  onClear: () => void;
  onOpen: (node: PositionedNode) => void;
}

export function GraphNodeShape({ node, selected, dimmed, matched, onSelect, onClear, onOpen }: GraphNodeShapeProps) {
  const [hover, setHover] = useState(false);

  const isScene = node.kind === "scene";

  const style = node.type ? GRAPH_TYPE_STYLE[node.type] : null;

  const Icon = style?.icon;

  const accent = isScene ? STATUS_COLOR[node.status ?? "draft"] : (style?.color ?? "currentColor");

  const showLabel = selected || matched || isScene || node.degree >= GRAPH_LABEL_MIN_DEGREE || hover;

  const small = isScene && node.pageKind !== "scene";

  const w = small ? 28 : 36;

  const label = node.label.length > LABEL_MAX ? `${node.label.slice(0, LABEL_MAX)}…` : node.label;

  return (
    <g
      transform={`translate(${node.x} ${node.y})`}
      tabIndex={0}
      role="button"
      aria-label={node.label}
      aria-pressed={selected}
      data-node-id={node.id}
      data-missing={node.missing ? "true" : undefined}
      data-dimmed={dimmed ? "true" : undefined}
      className={`graph-node outline-none focus-visible:[&>.graph-shape]:stroke-[3] ${node.missing ? "graph-node-missing" : ""} ${selected ? "graph-node-selected" : ""}`}
      style={{ opacity: dimmed ? 0.2 : node.missing ? 0.6 : 1, cursor: "pointer" }}
      onClick={() => onSelect(node.id)}
      onDoubleClick={() => onOpen(node)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onSelect(node.id);
        else if (e.key === "Escape") onClear();
      }}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
    >
      <title>{node.label}</title>
      {isScene ? (
        <rect className="graph-shape" x={-w / 2} y={-14} width={w} height={28} rx={small ? 4 : 6} fill="var(--color-card)" stroke={accent} strokeWidth={selected || matched ? 3 : small ? 1 : 2} strokeDasharray={small ? "4 2" : undefined} />
      ) : (
        <circle className="graph-shape" r={14} fill="var(--color-card)" stroke={accent} strokeWidth={selected || matched ? 3 : 2} strokeDasharray={node.missing ? "4 3" : undefined} />
      )}
      {isScene ? (
        <text textAnchor="middle" dy="0.35em" fontSize={11} fill="currentColor" pointerEvents="none">{(node.order ?? 0) + 1}</text>
      ) : Icon ? (
        <Icon x={-8} y={-8} width={16} height={16} color={accent} pointerEvents="none" />
      ) : null}
      {node.hidden > 0 ? (
        <g transform={`translate(${w / 2} -14)`} pointerEvents="none">
          <circle r={9} fill={accent} />
          <text textAnchor="middle" dy="0.35em" fontSize={9} fontWeight={700} fill="var(--color-background)">{`+${node.hidden}`}</text>
        </g>
      ) : null}
      {showLabel ? (
        <text y={isScene ? 30 : 28} textAnchor="middle" fontSize={11} fill="currentColor" pointerEvents="none" style={{ textDecoration: node.missing ? "line-through" : undefined }}>{label}</text>
      ) : null}
    </g>
  );
}
