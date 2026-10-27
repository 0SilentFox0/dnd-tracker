import type { MapPoint, Polygon } from "@/types/world";

const DUPLICATE_EPS = 0.002;

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

type Box = { left: number; top: number; width: number; height: number };

/** `box` — rect нерухомого зовнішнього шару картинки; трансформ (offset, zoom) на внутрішньому з origin 0 0. */
export function toMapPoint(client: { x: number; y: number }, box: Box, view: { zoom: number; offset: { x: number; y: number } }): MapPoint {
  return {
    x: clamp01((client.x - box.left - view.offset.x) / (box.width * view.zoom)),
    y: clamp01((client.y - box.top - view.offset.y) / (box.height * view.zoom)),
  };
}

const sameSpot = (a: MapPoint, b: MapPoint) => Math.abs(a.x - b.x) < DUPLICATE_EPS && Math.abs(a.y - b.y) < DUPLICATE_EPS;

export function closePolygon(points: MapPoint[]): Polygon | null {
  const unique: MapPoint[] = [];

  for (const p of points) {
    if (unique.length === 0 || !sameSpot(unique[unique.length - 1], p)) unique.push(p);
  }

  if (unique.length > 1 && sameSpot(unique[0], unique[unique.length - 1])) unique.pop();

  if (unique.length < 3) return null;

  const ring: Polygon = unique.map((p) => [p.x, p.y]);

  ring.push([unique[0].x, unique[0].y]);

  return ring;
}

export function polygonCentroid(polygon: Polygon): MapPoint {
  const ring = polygon.length > 1 && polygon[0][0] === polygon[polygon.length - 1][0] && polygon[0][1] === polygon[polygon.length - 1][1] ? polygon.slice(0, -1) : polygon;

  let area2 = 0;

  let cx = 0;

  let cy = 0;

  for (let i = 0; i < ring.length; i++) {
    const [x0, y0] = ring[i];

    const [x1, y1] = ring[(i + 1) % ring.length];

    const cross = x0 * y1 - x1 * y0;

    area2 += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }

  if (Math.abs(area2) < 1e-9) {
    const n = ring.length || 1;

    return { x: ring.reduce((s, p) => s + p[0], 0) / n, y: ring.reduce((s, p) => s + p[1], 0) / n };
  }

  return { x: cx / (3 * area2), y: cy / (3 * area2) };
}

export function fitBox(container: { width: number; height: number }, aspect: number): Box {
  const width = Math.min(container.width, container.height * aspect);

  const height = width / aspect;

  return { left: (container.width - width) / 2, top: (container.height - height) / 2, width, height };
}
