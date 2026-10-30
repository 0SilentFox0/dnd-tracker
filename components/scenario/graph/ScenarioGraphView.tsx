"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Maximize, Minus, Plus } from "lucide-react";

import { GraphEdgeLine, SEQUENCE_MARKER_ID } from "./GraphEdgeLine";
import { GraphLegend } from "./GraphLegend";
import { GraphNodeShape } from "./GraphNodeShape";

import { Button } from "@/components/ui/button";
import { GRAPH_TYPE_STYLE } from "@/lib/constants/scenario-graph";
import { DRAG_THRESHOLD } from "@/lib/hooks/common";
import { pickLabels } from "@/lib/utils/scenario/graph/labels";
import type { PositionedGraph, PositionedNode } from "@/lib/utils/scenario/graph/layout";

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const PAD = 80;

const MIN_W = 120;

const MAX_W = 20000;

const MAX_FIT_W = 2400;

const MIN_FIT_W = 1200;

const FALLBACK_ASPECT = 4 / 3;

const WHEEL_K = 0.0015;

function fitBox(graph: PositionedGraph, aspect: number): Box {
  const { bounds } = graph;

  const w0 = bounds.w + PAD * 2;

  const h0 = bounds.h + PAD * 2;

  const full = Math.max(w0, h0 * aspect, MIN_FIT_W);

  if (full <= MAX_FIT_W) return { x: bounds.minX + bounds.w / 2 - full / 2, y: bounds.minY + bounds.h / 2 - full / aspect / 2, w: full, h: full / aspect };

  const weight = graph.nodes.reduce((s, n) => s + 1 + n.degree, 0);

  const cx = graph.nodes.reduce((s, n) => s + n.x * (1 + n.degree), 0) / weight;

  const cy = graph.nodes.reduce((s, n) => s + n.y * (1 + n.degree), 0) / weight;

  return { x: cx - MAX_FIT_W / 2, y: cy - MAX_FIT_W / aspect / 2, w: MAX_FIT_W, h: MAX_FIT_W / aspect };
}

function zoomBox(box: Box, factor: number, cx: number, cy: number): Box {
  const w = Math.min(MAX_W, Math.max(MIN_W, box.w * factor));

  const k = w / box.w;

  return { x: cx - (cx - box.x) * k, y: cy - (cy - box.y) * k, w, h: box.h * k };
}

export interface ScenarioGraphViewProps {
  graph: PositionedGraph;
  selection: { nodes: ReadonlySet<string>; edges: ReadonlySet<string> };
  selectedId: string | null;
  focus: { id: string; n: number } | null;
  showSequence: boolean;
  matched: ReadonlySet<string>;
  onSelect: (id: string) => void;
  onClear: () => void;
  onOpen: (node: PositionedNode) => void;
}

export function ScenarioGraphView({ graph, selection, selectedId, focus, showSequence, matched, onSelect, onClear, onOpen }: ScenarioGraphViewProps) {
  const t = useTranslations("scenarioGraph");

  const svgRef = useRef<SVGSVGElement>(null);

  const aspect = useCallback(() => {
    const rect = svgRef.current?.getBoundingClientRect();

    return rect && rect.width > 0 && rect.height > 0 ? rect.width / rect.height : FALLBACK_ASPECT;
  }, []);

  const [box, setBox] = useState<Box>(() => fitBox(graph, FALLBACK_ASPECT));

  const boxRef = useRef(box);

  useEffect(() => {
    boxRef.current = box;
  }, [box]);

  const pointers = useRef(new Map<number, { x: number; y: number }>());

  const drag = useRef({ moved: 0, pinch: 0 });

  const fit = useCallback(() => setBox(fitBox(graph, aspect())), [graph, aspect]);

  const [fittedTo, setFittedTo] = useState(graph.bounds);

  if (fittedTo !== graph.bounds) {
    setFittedTo(graph.bounds);
    setBox(fitBox(graph, FALLBACK_ASPECT));
  }

  const [hoverId, setHoverId] = useState<string | null>(null);

  const byId = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph.nodes]);

  const hoverEdges = useMemo(() => {
    if (!hoverId) return null;

    const edges = new Set<string>();

    const nodes = new Set([hoverId]);

    for (const e of graph.edges) {
      if (e.source !== hoverId && e.target !== hoverId) continue;

      edges.add(e.id);
      nodes.add(e.source);
      nodes.add(e.target);
    }

    return { edges, nodes };
  }, [hoverId, graph.edges]);

  const labelled = useMemo(() => pickLabels(graph.nodes, new Set([...selection.nodes, ...matched])), [graph.nodes, selection.nodes, matched]);

  const active = selectedId ? selection : (hoverEdges ?? { edges: new Set<string>(), nodes: new Set<string>() });

  const [seenFocus, setSeenFocus] = useState(focus);

  const pending = focus !== seenFocus && focus ? byId.get(focus.id) : null;

  if (focus !== seenFocus && (!focus || pending)) {
    setSeenFocus(focus);

    const node = pending;

    if (node) setBox((b) => ({ ...b, x: node.x - b.w / 2, y: node.y - b.h / 2 }));
  }

  const scale = () => {
    const rect = svgRef.current?.getBoundingClientRect();

    const b = boxRef.current;

    return rect && rect.width > 0 && rect.height > 0 ? Math.max(b.w / rect.width, b.h / rect.height) : 1;
  };

  const zoomAt = useCallback((factor: number, clientX?: number, clientY?: number) => {
    const b = boxRef.current;

    const rect = svgRef.current?.getBoundingClientRect();

    const k = scale();

    const cx = rect && clientX !== undefined && rect.width > 0 ? b.x + (clientX - rect.left - rect.width / 2) * k + b.w / 2 : b.x + b.w / 2;

    const cy = rect && clientY !== undefined && rect.height > 0 ? b.y + (clientY - rect.top - rect.height / 2) * k + b.h / 2 : b.y + b.h / 2;

    setBox(zoomBox(b, factor, cx, cy));
  }, []);

  useEffect(() => {
    const el = svgRef.current;

    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAt(Math.exp(Math.max(-120, Math.min(120, e.deltaY * (e.deltaMode === 1 ? 16 : 1))) * WHEEL_K), e.clientX, e.clientY);
    };

    el.addEventListener("wheel", onWheel, { passive: false });

    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const onPointerDown = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    drag.current = { moved: 0, pinch: 0 };
  };

  const endPointer = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    drag.current.pinch = 0;

    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);

    if (!prev) return;

    if (e.pointerType === "mouse" && e.buttons === 0) {
      endPointer(e);

      return;
    }

    const next = { x: e.clientX, y: e.clientY };

    if (pointers.current.size === 2) {
      pointers.current.set(e.pointerId, next);

      const [a, b] = [...pointers.current.values()] as [{ x: number; y: number }, { x: number; y: number }];

      const dist = Math.hypot(a.x - b.x, a.y - b.y);

      if (drag.current.pinch > 0 && dist > 0) zoomAt(drag.current.pinch / dist, (a.x + b.x) / 2, (a.y + b.y) / 2);

      drag.current.pinch = dist;
      drag.current.moved = DRAG_THRESHOLD + 1;

      return;
    }

    const dx = next.x - prev.x;

    const dy = next.y - prev.y;

    drag.current.moved += Math.abs(dx) + Math.abs(dy);
    pointers.current.set(e.pointerId, next);

    if (drag.current.moved <= DRAG_THRESHOLD) return;

    // captured only once panning starts: capturing on down would retarget the node click
    e.currentTarget.setPointerCapture?.(e.pointerId);

    const k = scale();

    setBox((b) => ({ ...b, x: b.x - dx * k, y: b.y - dy * k }));
  };

  return (
    <div className="relative size-full overflow-hidden rounded-lg border bg-gradient-to-b from-card/30 to-card/70">
      <svg
        ref={svgRef}
        role="group"
        aria-label={t("graph.label")}
        viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
        className="size-full touch-none select-none text-foreground"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onClickCapture={(e) => {
          if (drag.current.moved > DRAG_THRESHOLD) {
            e.stopPropagation();
            drag.current.moved = 0;
          }
        }}
        onClick={(e) => e.target === e.currentTarget && onClear()}
      >
        <defs>
          <pattern id="graph-dots" width={36} height={36} patternUnits="userSpaceOnUse">
            <circle cx={2} cy={2} r={1.3} fill="var(--muted-foreground)" opacity={0.28} />
          </pattern>
          <marker id={SEQUENCE_MARKER_ID} viewBox="0 0 10 10" refX={8} refY={5} markerWidth={18} markerHeight={18} markerUnits="userSpaceOnUse" orient="auto">
            <path d="M2 1.5 L8 5 L2 8.5" fill="none" stroke="var(--color-hud-gold-bright)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          </marker>
        </defs>
        <rect x={box.x} y={box.y} width={box.w} height={box.h} fill="url(#graph-dots)" pointerEvents="none" />
        <g>
          {showSequence
            ? graph.sequence.map((edge) => {
                const from = byId.get(edge.source);

                const to = byId.get(edge.target);

                if (!from || !to) return null;

                return <GraphEdgeLine key={edge.id} edge={edge} from={from} to={to} color="var(--color-hud-gold-bright)" sequence dimmed={!!selectedId && !selection.nodes.has(edge.source) && !selection.nodes.has(edge.target)} highlighted={false} secretLabel="" />;
              })
            : null}
          {graph.edges.map((edge) => {
            const from = byId.get(edge.source);

            const to = byId.get(edge.target);

            if (!from || !to) return null;

            return <GraphEdgeLine key={edge.id} edge={edge} from={from} to={to} color={to.type ? GRAPH_TYPE_STYLE[to.type].color : "currentColor"} dimmed={!!selectedId && !selection.edges.has(edge.id)} highlighted={active.edges.has(edge.id)} secretLabel={t("graph.secretEdge")} />;
          })}
          {graph.nodes.map((node) => (
            <GraphNodeShape key={node.id} node={node} selected={node.id === selectedId} dimmed={!!selectedId && !selection.nodes.has(node.id)} matched={matched.has(node.id)} hovered={node.id === hoverId} labelled={labelled.has(node.id)} onHover={setHoverId} onSelect={onSelect} onClear={onClear} onOpen={onOpen} />
          ))}
        </g>
      </svg>
      <div className="absolute left-2 top-2 flex flex-col gap-1">
        <Button size="icon" variant="outline" aria-label={t("toolbar.zoomIn")} onClick={() => zoomAt(1 / 1.3)}><Plus /></Button>
        <Button size="icon" variant="outline" aria-label={t("toolbar.zoomOut")} onClick={() => zoomAt(1.3)}><Minus /></Button>
        <Button size="icon" variant="outline" aria-label={t("toolbar.fit")} onClick={fit}><Maximize /></Button>
      </div>
      <GraphLegend showSequence={showSequence} />
    </div>
  );
}
