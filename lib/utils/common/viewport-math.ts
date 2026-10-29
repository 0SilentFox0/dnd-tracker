import { clamp } from "@/lib/utils/common/clamp";

export interface Viewport {
  zoom: number;
  x: number;
  y: number;
}

export interface ZoomBounds {
  min: number;
  max: number;
}

export const INITIAL_VIEWPORT: Viewport = { zoom: 1, x: 0, y: 0 };

const clampZoom = (z: number, { min, max }: ZoomBounds): number => clamp(z, min, max);

export function clampOffset(o: number, zoom: number, size: number): number {
  return clamp(o, -(zoom - 1) * size, 0);
}

export function zoomAt(v: Viewport, zoom: number, px: number, py: number, w: number, h: number, bounds: ZoomBounds): Viewport {
  const next = clampZoom(zoom, bounds);

  const cx = (px - v.x) / v.zoom;

  const cy = (py - v.y) / v.zoom;

  return { zoom: next, x: clampOffset(px - cx * next, next, w), y: clampOffset(py - cy * next, next, h) };
}

export function focusAt(v: Viewport, nx: number, ny: number, zoom: number, w: number, h: number, bounds: ZoomBounds): Viewport {
  const next = clampZoom(Math.max(v.zoom, zoom), bounds);

  return { zoom: next, x: clampOffset(w / 2 - nx * w * next, next, w), y: clampOffset(h / 2 - ny * h * next, next, h) };
}
