"use client";

import { type PointerEvent, useCallback, useEffect, useEffectEvent, useRef, useState } from "react";

import { clampOffset, focusAt, INITIAL_VIEWPORT, type Viewport, zoomAt,type ZoomBounds } from "@/lib/utils/common/viewport-math";

const DEFAULT_MIN_ZOOM = 1;

const DEFAULT_MAX_ZOOM = 3;

const WHEEL_STEP = 1.1;

export const DRAG_THRESHOLD = 4;

export interface ViewportOptions {
  /** один палець не тягне карту (малювання місцевості), щипок масштабує як завжди */
  panLocked?: boolean;
  /** контейнер карти прокручується: без зуму колесо гортає його, а масштабує лише з Ctrl/⌘ */
  wheelScrolls?: boolean;
  minZoom?: number;
  maxZoom?: number;
}

export function useViewport({ panLocked = false, wheelScrolls = false, minZoom = DEFAULT_MIN_ZOOM, maxZoom = DEFAULT_MAX_ZOOM }: ViewportOptions = {}) {
  const [view, setView] = useState<Viewport>(INITIAL_VIEWPORT);

  const locked = useRef(panLocked);

  useEffect(() => {
    locked.current = panLocked;
  }, [panLocked]);

  const bounds = useRef<ZoomBounds>({ min: minZoom, max: maxZoom });

  useEffect(() => {
    bounds.current = { min: minZoom, max: maxZoom };
  }, [minZoom, maxZoom]);

  const pointers = useRef(new Map<number, { x: number; y: number }>());

  const drag = useRef<{ startX: number; startY: number; active: boolean } | null>(null);

  const pinch = useRef<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const dragged = useRef(false);

  const onWheel = useEffectEvent((e: globalThis.WheelEvent, el: HTMLElement) => {
    if (wheelScrolls && view.zoom === 1 && !e.ctrlKey && !e.metaKey) return;

    e.preventDefault();

    const rect = el.getBoundingClientRect();

    const factor = e.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP;

    setView((v) => zoomAt(v, v.zoom * factor, e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height, bounds.current));
  });

  useEffect(() => {
    const el = containerRef.current;

    if (!el) return;

    const listener = (e: globalThis.WheelEvent) => onWheel(e, el);

    el.addEventListener("wheel", listener, { passive: false });

    return () => el.removeEventListener("wheel", listener);
  }, []);

  const onPointerDown = useCallback((e: PointerEvent<HTMLElement>) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragged.current = false;
    drag.current = pointers.current.size === 1 ? { startX: e.clientX, startY: e.clientY, active: false } : null;
    pinch.current = null;
  }, []);

  const onPointerMove = useCallback((e: PointerEvent<HTMLElement>) => {
    const prev = pointers.current.get(e.pointerId);

    if (!prev) return;

    const next = { x: e.clientX, y: e.clientY };

    pointers.current.set(e.pointerId, next);

    const rect = e.currentTarget.getBoundingClientRect();

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];

      const dist = Math.hypot(a.x - b.x, a.y - b.y);

      const last = pinch.current;

      pinch.current = dist;
      dragged.current = true;

      if (last && last > 0) {
        const mx = (a.x + b.x) / 2 - rect.left;

        const my = (a.y + b.y) / 2 - rect.top;

        setView((v) => zoomAt(v, v.zoom * (dist / last), mx, my, rect.width, rect.height, bounds.current));
      }

      return;
    }

    const d = drag.current;

    if (!d || locked.current) return;

    if (!d.active && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > DRAG_THRESHOLD) {
      d.active = true;
      dragged.current = true;
      // captured only once panning starts: capturing on down would retarget the child click
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }

    if (!d.active) return;

    const dx = next.x - prev.x;

    const dy = next.y - prev.y;

    setView((v) => (v.zoom > 1 ? { ...v, x: clampOffset(v.x + dx, v.zoom, rect.width), y: clampOffset(v.y + dy, v.zoom, rect.height) } : v));
  }, []);

  const onPointerUp = useCallback((e: PointerEvent<HTMLElement>) => {
    pointers.current.delete(e.pointerId);
    pinch.current = null;
    drag.current = null;
  }, []);

  const wasDragged = useCallback(() => dragged.current, []);

  const reset = useCallback(() => setView(INITIAL_VIEWPORT), []);

  const zoomBy = useCallback((factor: number) => {
    const el = containerRef.current;

    const rect = el?.getBoundingClientRect();

    const w = rect?.width ?? 0;

    const h = rect?.height ?? 0;

    setView((v) => zoomAt(v, v.zoom * factor, w / 2, h / 2, w, h, bounds.current));
  }, []);

  const focusOn = useCallback((nx: number, ny: number, zoom: number) => {
    const rect = containerRef.current?.getBoundingClientRect();

    const w = rect?.width ?? 0;

    const h = rect?.height ?? 0;

    setView((v) => focusAt(v, nx, ny, zoom, w, h, bounds.current));
  }, []);

  return {
    zoom: view.zoom,
    offset: { x: view.x, y: view.y },
    containerRef,
    wasDragged,
    bind: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
    reset,
    zoomBy,
    focusOn,
  };
}
