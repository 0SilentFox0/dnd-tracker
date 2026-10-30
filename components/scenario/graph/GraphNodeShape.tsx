"use client";

import { memo, useState } from "react";
import { useTranslations } from "next-intl";

import { GRAPH_LABEL_MIN_DEGREE, GRAPH_SCENE_H, GRAPH_SCENE_W, GRAPH_TYPE_STYLE } from "@/lib/constants/scenario-graph";
import type { PositionedNode } from "@/lib/utils/scenario/graph/layout";

export const GRAPH_STATUS_COLOR = { draft: "var(--color-hud-gold-bright)", ready: "var(--color-hud-good)", personal: "var(--color-chart-2)" } as const;

const TITLE_MAX = 19;

const LABEL_MAX = 26;

const HALO = { stroke: "var(--color-background)", strokeWidth: 3.5, paintOrder: "stroke", strokeLinejoin: "round" } as const;

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max)}…` : text);

export interface GraphNodeShapeProps {
  node: PositionedNode;
  selected: boolean;
  dimmed: boolean;
  matched: boolean;
  onSelect: (id: string) => void;
  onClear: () => void;
  onOpen: (node: PositionedNode) => void;
}

function GraphNodeShapeImpl({ node, selected, dimmed, matched, onSelect, onClear, onOpen }: GraphNodeShapeProps) {
  const t = useTranslations("scenarioGraph.graph");

  const [hover, setHover] = useState(false);

  const isScene = node.kind === "scene";

  const style = node.type ? GRAPH_TYPE_STYLE[node.type] : null;

  const Icon = style?.icon;

  const accent = isScene ? GRAPH_STATUS_COLOR[node.status ?? "draft"] : (style?.color ?? "currentColor");

  const showLabel = selected || matched || node.degree >= GRAPH_LABEL_MIN_DEGREE || hover;

  const side = isScene && node.pageKind !== "scene";

  const w = side ? GRAPH_SCENE_W * 0.76 : GRAPH_SCENE_W;

  const h = side ? GRAPH_SCENE_H * 0.78 : GRAPH_SCENE_H;

  const r = 13 + Math.min(node.degree, 8);

  const active = selected || matched || hover;

  return (
    <g
      transform={`translate(${node.x} ${node.y})`}
      tabIndex={0}
      role="button"
      aria-label={node.missing ? `${node.label} (${t("missing")})` : node.hidden > 0 ? `${node.label} (${t("hidden", { count: node.hidden })})` : node.label}
      aria-pressed={selected}
      data-node-id={node.id}
      data-missing={node.missing ? "true" : undefined}
      data-dimmed={dimmed ? "true" : undefined}
      className={`graph-node outline-none focus-visible:[&>.graph-shape]:stroke-[3] ${node.missing ? "graph-node-missing" : ""} ${selected ? "graph-node-selected" : ""}`}
      style={{ opacity: dimmed ? 0.2 : node.missing ? 0.65 : 1, cursor: "pointer", filter: active ? `drop-shadow(0 0 7px ${accent})` : undefined, transition: "opacity 120ms" }}
      onClick={() => onSelect(node.id)}
      onDoubleClick={() => onOpen(node)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(node.id);
        } else if (e.key === "Escape") onClear();
      }}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
    >
      <title>{node.label}</title>
      {isScene ? (
        <>
          <rect className="graph-shape" x={-w / 2} y={-h / 2} width={w} height={h} rx={11} fill="var(--color-card)" stroke={active ? accent : "var(--color-border)"} strokeWidth={selected || matched ? 2.5 : 1.5} strokeDasharray={side ? "5 3" : undefined} />
          <rect x={-w / 2 + 6} y={-h / 2 + 7} width={4} height={h - 14} rx={2} fill={accent} pointerEvents="none" />
          <text x={-w / 2 + 18} y={side ? -2 : -5} fontSize={9.5} fill="var(--color-muted-foreground)" pointerEvents="none">{`#${(node.order ?? 0) + 1}`}</text>
          <text x={-w / 2 + 18} y={side ? 11 : 12} fontSize={12.5} fontWeight={600} fill="currentColor" pointerEvents="none">{clip(node.label, side ? 14 : TITLE_MAX)}</text>
        </>
      ) : (
        <>
          <circle className="graph-shape" r={r} fill={`color-mix(in srgb, ${accent} 22%, var(--color-card))`} stroke={accent} strokeWidth={selected || matched ? 3 : 2} strokeDasharray={node.missing ? "4 3" : undefined} />
          {Icon ? <Icon x={-8} y={-8} width={16} height={16} color={accent} pointerEvents="none" /> : null}
        </>
      )}
      {node.hidden > 0 ? (
        <g transform={`translate(${w / 2 - 4} ${-h / 2 - 2})`} pointerEvents="none">
          <title>{t("hidden", { count: node.hidden })}</title>
          <rect x={-12} y={-9} width={24} height={18} rx={9} fill={accent} />
          <text textAnchor="middle" dy="0.35em" fontSize={10} fontWeight={700} fill="var(--color-background)">{`+${node.hidden}`}</text>
        </g>
      ) : null}
      {node.missing ? (
        <g transform={`translate(${r * 0.7} ${-r * 0.7})`} pointerEvents="none" data-broken-marker="true">
          <title>{t("missing")}</title>
          <circle r={7.5} fill="var(--color-destructive)" />
          <text textAnchor="middle" dy="0.35em" fontSize={10} fontWeight={700} fill="var(--color-background)">!</text>
        </g>
      ) : null}
      {!isScene && showLabel ? (
        <text y={r + 14} textAnchor="middle" fontSize={11.5} fontWeight={500} fill="currentColor" pointerEvents="none" style={{ ...HALO, textDecoration: node.missing ? "line-through" : undefined }}>{clip(node.label, LABEL_MAX)}</text>
      ) : null}
    </g>
  );
}

export const GraphNodeShape = memo(GraphNodeShapeImpl);
