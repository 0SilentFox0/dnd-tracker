"use client";

import { type PointerEvent, useCallback, useEffect, useRef, useState } from "react";

import { DRAG_THRESHOLD } from "@/lib/hooks/common";
import { cellAtScreenPoint, cellKey, cellLine } from "@/lib/utils/battle/grid";
import type { BattleMapActions, GridPoint } from "@/types/battle";

interface Stroke {
  pointerId: number;
  x: number;
  y: number;
  moved: boolean;
  last: GridPoint;
  cells: Map<string, GridPoint>;
}

const NO_CELLS: ReadonlySet<string> = new Set();

interface StrokePaintOptions {
  painting: boolean;
  dims: { cols: number; rows: number };
  onStroke: BattleMapActions["onStroke"];
}

/** Штрих місцевості по карті: клітинки під вказівником збираються в `preview`, на відпусканні йдуть в `onStroke`. */
export function useStrokePaint({ painting, dims, onStroke }: StrokePaintOptions) {
  const { cols, rows } = dims;

  const svgRef = useRef<SVGSVGElement>(null);

  const strokeRef = useRef<Stroke | null>(null);

  const [preview, setPreview] = useState<ReadonlySet<string>>(NO_CELLS);

  const onStrokeStart = useCallback((p: GridPoint, e: PointerEvent) => {
    if (!e.isPrimary || e.button !== 0) return;

    strokeRef.current = { pointerId: e.pointerId, x: e.clientX, y: e.clientY, moved: false, last: p, cells: new Map([[cellKey(p), p]]) };
    setPreview(new Set([cellKey(p)]));
  }, []);

  useEffect(() => {
    if (!painting) return;

    const drop = () => {
      strokeRef.current = null;
      setPreview(NO_CELLS);
    };

    const onMove = (e: globalThis.PointerEvent) => {
      const s = strokeRef.current;

      const svg = svgRef.current;

      if (!s || !svg || e.pointerId !== s.pointerId) return;

      // дрібне тремтіння клацання не має зачіпати сусідню клітинку
      if (!s.moved && Math.hypot(e.clientX - s.x, e.clientY - s.y) <= DRAG_THRESHOLD) return;

      s.moved = true;

      const ctm = svg.getScreenCTM();

      const cell = ctm && cellAtScreenPoint({ cols, rows }, ctm, e.clientX, e.clientY);

      if (!cell || (cell.x === s.last.x && cell.y === s.last.y)) return;

      for (const c of cellLine(s.last, cell)) s.cells.set(cellKey(c), c);

      s.last = cell;
      setPreview(new Set(s.cells.keys()));
    };

    // другий палець — це щипок, а не штрих
    const onDown = (e: globalThis.PointerEvent) => {
      if (strokeRef.current && e.pointerId !== strokeRef.current.pointerId) drop();
    };

    const onUp = (e: globalThis.PointerEvent) => {
      const s = strokeRef.current;

      if (!s || e.pointerId !== s.pointerId) return;

      drop();
      onStroke?.([...s.cells.values()]);
    };

    const onCancel = (e: globalThis.PointerEvent) => {
      if (strokeRef.current?.pointerId === e.pointerId) drop();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      drop();
    };
  }, [painting, onStroke, cols, rows]);

  return { svgRef, preview, onStrokeStart };
}
