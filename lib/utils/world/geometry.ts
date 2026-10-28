import type { MapPoint, Polygon, RevealShape } from "@/types/world";

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

const scaled = (p: MapPoint, aspect: number): MapPoint => ({ x: p.x, y: p.y / aspect });

function distToSegmentScaled(p: MapPoint, a: MapPoint, b: MapPoint): number {
  const dx = b.x - a.x;

  const dy = b.y - a.y;

  const len2 = dx * dx + dy * dy;

  const t = len2 === 0 ? 0 : Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));

  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Відстань у частках ширини карти; `aspect = width / height`. */
export function distToSegment(p: MapPoint, a: MapPoint, b: MapPoint, aspect: number): number {
  return distToSegmentScaled(scaled(p, aspect), scaled(a, aspect), scaled(b, aspect));
}

const shapeEnds = (shape: RevealShape): [MapPoint, MapPoint] =>
  shape.t === "p" ? [{ x: shape.x, y: shape.y }, { x: shape.x, y: shape.y }] : [{ x: shape.x1, y: shape.y1 }, { x: shape.x2, y: shape.y2 }];

export function isRevealed(p: MapPoint, shapes: RevealShape[], radius: number, aspect: number): boolean {
  return shapes.some((shape) => {
    const [a, b] = shapeEnds(shape);

    return distToSegment(p, a, b, aspect) <= radius;
  });
}

export const coversPoint = (shapes: RevealShape[], p: MapPoint, radius: number, aspect: number) => isRevealed(p, shapes, radius, aspect);

export function pointInPolygon(p: MapPoint, polygon: Polygon): boolean {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];

    const [xj, yj] = polygon[j];

    if (yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi) inside = !inside;
  }

  return inside;
}

const cross = (o: MapPoint, a: MapPoint, b: MapPoint) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

function segmentsIntersect(a: MapPoint, b: MapPoint, c: MapPoint, d: MapPoint): boolean {
  const d1 = cross(a, b, c);

  const d2 = cross(a, b, d);

  const d3 = cross(c, d, a);

  const d4 = cross(c, d, b);

  return d1 * d2 < 0 && d3 * d4 < 0;
}

function segmentToSegment(a: MapPoint, b: MapPoint, c: MapPoint, d: MapPoint): number {
  if (segmentsIntersect(a, b, c, d)) return 0;

  return Math.min(distToSegmentScaled(a, c, d), distToSegmentScaled(b, c, d), distToSegmentScaled(c, a, b), distToSegmentScaled(d, a, b));
}

export function zoneTouchesReveal(polygon: Polygon, shapes: RevealShape[], radius: number, aspect: number): boolean {
  const ring = polygon.map(([x, y]) => scaled({ x, y }, aspect));

  return shapes.some((shape) => {
    const [a, b] = shapeEnds(shape);

    if (pointInPolygon(a, polygon) || pointInPolygon(b, polygon)) return true;

    const sa = scaled(a, aspect);

    const sb = scaled(b, aspect);

    for (let i = 0; i < ring.length; i++) {
      if (segmentToSegment(sa, sb, ring[i], ring[(i + 1) % ring.length]) <= radius) return true;
    }

    return false;
  });
}
