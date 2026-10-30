"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";

import { GraphNodeAvatar } from "./GraphNodeAvatar";

import { GRAPH_SCENE_H, GRAPH_SCENE_W, GRAPH_TYPE_STYLE } from "@/lib/constants/scenario-graph";
import { graphImageSrc } from "@/lib/utils/scenario/graph/image";
import type { PositionedNode } from "@/lib/utils/scenario/graph/layout";

export const GRAPH_STATUS_COLOR = { draft: "var(--color-hud-gold-bright)", ready: "var(--color-hud-good)", personal: "var(--color-chart-2)" } as const;

const TITLE_MAX = 19;

const LABEL_MAX = 26;

const HALO = { stroke: "var(--background)", strokeWidth: 3.5, paintOrder: "stroke", strokeLinejoin: "round" } as const;

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max)}…` : text);

export interface GraphNodeShapeProps {
  node: PositionedNode;
  selected: boolean;
  dimmed: boolean;
  matched: boolean;
  hovered: boolean;
  labelled: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  onClear: () => void;
  onOpen: (node: PositionedNode) => void;
}

function GraphNodeShapeImpl({ node, selected, dimmed, matched, hovered, labelled, onHover, onSelect, onClear, onOpen }: GraphNodeShapeProps) {
  const t = useTranslations("scenarioGraph.graph");

  const isScene = node.kind === "scene";

  const style = node.type ? GRAPH_TYPE_STYLE[node.type] : null;

  const Icon = style?.icon;

  const accent = isScene ? GRAPH_STATUS_COLOR[node.status ?? "draft"] : (style?.color ?? "currentColor");

  const showLabel = selected || matched || labelled || hovered;

  const side = isScene && node.pageKind !== "scene";

  const w = side ? GRAPH_SCENE_W * 0.76 : GRAPH_SCENE_W;

  const h = side ? GRAPH_SCENE_H * 0.78 : GRAPH_SCENE_H;

  const r = 16 + Math.min(node.degree, 8);

  const glyph = Icon ? <Icon x={-9} y={-9} width={18} height={18} color={accent} pointerEvents="none" /> : null;

  const avatar = node.kind === "entity" ? graphImageSrc(node.image) : null;

  const active = selected || matched || hovered;

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
      style={{ opacity: dimmed ? 0.12 : node.missing ? 0.65 : 1, cursor: "pointer", filter: active ? `drop-shadow(0 0 7px ${accent})` : undefined, transition: "opacity 120ms" }}
      onClick={() => onSelect(node.id)}
      onDoubleClick={() => onOpen(node)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(node.id);
        } else if (e.key === "Escape") onClear();
      }}
      onPointerEnter={() => onHover(node.id)}
      onPointerLeave={() => onHover(null)}
    >
      <title>{node.label}</title>
      {isScene ? (
        <>
          <rect className="graph-shape" x={-w / 2} y={-h / 2} width={w} height={h} rx={11} fill="var(--card)" stroke={active ? accent : "var(--border)"} strokeWidth={selected || matched ? 2.5 : 1.5} strokeDasharray={side ? "5 3" : undefined} />
          <rect x={-w / 2 + 6} y={-h / 2 + 7} width={4} height={h - 14} rx={2} fill={accent} pointerEvents="none" />
          <text x={-w / 2 + 18} y={side ? -2 : -5} fontSize={10.5} fill="var(--muted-foreground)" pointerEvents="none">{`#${(node.order ?? 0) + 1}`}</text>
          <text x={-w / 2 + 18} y={side ? 11 : 12} fontSize={12.5} fontWeight={600} fill="currentColor" pointerEvents="none">{clip(node.label, side ? 14 : TITLE_MAX)}</text>
        </>
      ) : (
        <>
          <circle className="graph-shape" r={r} fill={`color-mix(in srgb, ${accent} 22%, var(--card))`} stroke={accent} strokeWidth={selected || matched ? 3 : 2} strokeDasharray={node.missing ? "4 3" : undefined} />
          {avatar ? <GraphNodeAvatar src={avatar} r={r} clipId={`ga-${node.id.replace(/[^a-zA-Z0-9]/g, "_")}`} fallback={glyph} /> : glyph}
        </>
      )}
      {selected ? <circle r={r + 5} fill="none" stroke={accent} strokeWidth={1.5} strokeDasharray="3 3" opacity={0.8} pointerEvents="none" style={{ display: isScene ? "none" : undefined }} /> : null}
      {node.hidden > 0 ? (
        <g transform={`translate(${w / 2 - 4} ${-h / 2 - 2})`} pointerEvents="none">
          <title>{t("hidden", { count: node.hidden })}</title>
          <rect x={-12} y={-9} width={24} height={18} rx={9} fill={accent} />
          <text textAnchor="middle" dy="0.35em" fontSize={10} fontWeight={700} fill="var(--background)">{`+${node.hidden}`}</text>
        </g>
      ) : null}
      {node.missing ? (
        <g transform={`translate(${r * 0.7} ${-r * 0.7})`} pointerEvents="none" data-broken-marker="true">
          <title>{t("missing")}</title>
          <circle r={7.5} fill="var(--destructive)" />
          <text textAnchor="middle" dy="0.35em" fontSize={10} fontWeight={700} fill="var(--background)">!</text>
        </g>
      ) : null}
      {!isScene && showLabel ? (
        <text y={r + 14} textAnchor="middle" fontSize={11.5} fontWeight={500} fill="currentColor" pointerEvents="none" style={{ ...HALO, textDecoration: node.missing ? "line-through" : undefined }}>{clip(node.label, LABEL_MAX)}</text>
      ) : null}
    </g>
  );
}

export const GraphNodeShape = memo(GraphNodeShapeImpl);
