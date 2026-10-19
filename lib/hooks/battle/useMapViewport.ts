"use client";

import { type PointerEvent, useCallback, useEffect, useRef, useState } from "react";

const MIN_ZOOM = 1;

const MAX_ZOOM = 3;

const WHEEL_STEP = 1.1;

export const DRAG_THRESHOLD = 4;

interface Viewport {
  zoom: number;
  x: number;
  y: number;
}

const INITIAL: Viewport = { zoom: 1, x: 0, y: 0 };

function clampZoom(z: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}

function clampOffset(o: number, zoom: number, size: number): number {
  return Math.min(0, Math.max(-(zoom - 1) * size, o));
}

function zoomAt(v: Viewport, zoom: number, px: number, py: number, w: number, h: number): Viewport {
  const next = clampZoom(zoom);

  const cx = (px - v.x) / v.zoom;

  const cy = (py - v.y) / v.zoom;

  return { zoom: next, x: clampOffset(px - cx * next, next, w), y: clampOffset(py - cy * next, next, h) };
}

export interface MapViewportOptions {
  /** один палець не тягне карту (малювання місцевості), щипок масштабує як завжди */
  panLocked?: boolean;
  /** контейнер карти прокручується: без зуму колесо гортає його, а масштабує лише з Ctrl/⌘ */
  wheelScrolls?: boolean;
}

export function useMapViewport({ panLocked = false, wheelScrolls = false }: MapViewportOptions = {}) {
  const [view, setView] = useState<Viewport>(INITIAL);

  const locked = useRef(panLocked);

  const latest = useRef({ wheelScrolls, zoom: view.zoom });

  useEffect(() => {
    locked.current = panLocked;
    latest.current = { wheelScrolls, zoom: view.zoom };
  }, [panLocked, wheelScrolls, view.zoom]);

  const pointers = useRef(new Map<number, { x: number; y: number }>());

  const drag = useRef<{ startX: number; startY: number; active: boolean } | null>(null);

  const pinch = useRef<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const dragged = useRef(false);

  useEffect(() => {
    const el = containerRef.current;

    if (!el) return;

    const onWheel = (e: globalThis.WheelEvent) => {
      const { wheelScrolls: scrolls, zoom } = latest.current;

      if (scrolls && zoom === 1 && !e.ctrlKey && !e.metaKey) return;

      e.preventDefault();

      const rect = el.getBoundingClientRect();

      const factor = e.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP;

      setView((v) => zoomAt(v, v.zoom * factor, e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height));
    };

    el.addEventListener("wheel", onWheel, { passive: false });

    return () => el.removeEventListener("wheel", onWheel);
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

        setView((v) => zoomAt(v, v.zoom * (dist / last), mx, my, rect.width, rect.height));
      }

      return;
    }

    const d = drag.current;

    if (!d || locked.current) return;

    if (!d.active && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > DRAG_THRESHOLD) {
      d.active = true;
      dragged.current = true;
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

  const reset = useCallback(() => setView(INITIAL), []);

  return {
    zoom: view.zoom,
    offset: { x: view.x, y: view.y },
    containerRef,
    wasDragged,
    bind: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
    reset,
  };
}
