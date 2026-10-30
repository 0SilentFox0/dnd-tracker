"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Maximize, Minus, Plus } from "lucide-react";

import { GraphEdgeLine } from "./GraphEdgeLine";
import { GraphNodeShape } from "./GraphNodeShape";

import { Button } from "@/components/ui/button";
import { DRAG_THRESHOLD } from "@/lib/hooks/common";
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

const FALLBACK_ASPECT = 4 / 3;

function fitBox(bounds: PositionedGraph["bounds"], aspect: number): Box {
  const w0 = bounds.w + PAD * 2;

  const h0 = bounds.h + PAD * 2;

  const w = Math.max(w0, h0 * aspect, MIN_W);

  const h = w / aspect;

  return { x: bounds.minX + bounds.w / 2 - w / 2, y: bounds.minY + bounds.h / 2 - h / 2, w, h };
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
  matched: ReadonlySet<string>;
  onSelect: (id: string) => void;
  onClear: () => void;
  onOpen: (node: PositionedNode) => void;
}

export function ScenarioGraphView({ graph, selection, selectedId, matched, onSelect, onClear, onOpen }: ScenarioGraphViewProps) {
  const t = useTranslations("scenarioGraph");

  const svgRef = useRef<SVGSVGElement>(null);

  const aspect = useCallback(() => {
    const rect = svgRef.current?.getBoundingClientRect();

    return rect && rect.width > 0 && rect.height > 0 ? rect.width / rect.height : FALLBACK_ASPECT;
  }, []);

  const [box, setBox] = useState<Box>(() => fitBox(graph.bounds, FALLBACK_ASPECT));

  const boxRef = useRef(box);

  useEffect(() => {
    boxRef.current = box;
  }, [box]);

  const pointers = useRef(new Map<number, { x: number; y: number }>());

  const drag = useRef({ moved: 0, pinch: 0 });

  const fit = useCallback(() => setBox(fitBox(graph.bounds, aspect())), [graph.bounds, aspect]);

  const [fittedTo, setFittedTo] = useState(graph.bounds);

  if (fittedTo !== graph.bounds) {
    setFittedTo(graph.bounds);
    setBox(fitBox(graph.bounds, FALLBACK_ASPECT));
  }

  const byId = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph.nodes]);

  useEffect(() => {
    const node = selectedId ? byId.get(selectedId) : null;

    if (!node) return;

    const b = boxRef.current;

    const inside = node.x > b.x && node.x < b.x + b.w && node.y > b.y && node.y < b.y + b.h;

    if (!inside) setBox({ ...b, x: node.x - b.w / 2, y: node.y - b.h / 2 });
  }, [selectedId, byId]);

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
      zoomAt(e.deltaY > 0 ? 1.15 : 1 / 1.15, e.clientX, e.clientY);
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
    <div className="relative size-full overflow-hidden rounded-lg border bg-card/40">
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
        <g>
          {graph.edges.map((edge) => {
            const from = byId.get(edge.source);

            const to = byId.get(edge.target);

            if (!from || !to) return null;

            return <GraphEdgeLine key={edge.id} edge={edge} from={from} to={to} dimmed={!!selectedId && !selection.edges.has(edge.id)} highlighted={selection.edges.has(edge.id)} secretLabel={t("graph.secretEdge")} />;
          })}
          {graph.nodes.map((node) => (
            <GraphNodeShape key={node.id} node={node} selected={node.id === selectedId} dimmed={!!selectedId && !selection.nodes.has(node.id)} matched={matched.has(node.id)} onSelect={onSelect} onClear={onClear} onOpen={onOpen} />
          ))}
        </g>
      </svg>
      <div className="absolute right-2 top-2 flex flex-col gap-1">
        <Button size="icon" variant="outline" aria-label={t("toolbar.zoomIn")} onClick={() => zoomAt(1 / 1.3)}><Plus /></Button>
        <Button size="icon" variant="outline" aria-label={t("toolbar.zoomOut")} onClick={() => zoomAt(1.3)}><Minus /></Button>
        <Button size="icon" variant="outline" aria-label={t("toolbar.fit")} onClick={fit}><Maximize /></Button>
      </div>
    </div>
  );
}
