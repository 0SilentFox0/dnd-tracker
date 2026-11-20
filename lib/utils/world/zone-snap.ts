import type { MapPoint, Polygon } from '@/types/world';

type Pt = [number, number];

function nearestOnSegment(p: MapPoint, a: Pt, b: Pt, k: number): MapPoint {
    const dx = b[0] - a[0];

    const dy = (b[1] - a[1]) * k;

    const len2 = dx * dx + dy * dy;

    const t =
        len2 === 0
            ? 0
            : Math.max(
                  0,
                  Math.min(1, ((p.x - a[0]) * dx + (p.y - a[1]) * k * dy) / len2)
              );

    return { x: a[0] + t * (b[0] - a[0]), y: a[1] + t * (b[1] - a[1]) };
}

const dist = (p: MapPoint, q: MapPoint, k: number) =>
    Math.hypot(p.x - q.x, (p.y - q.y) * k);

/** radius is in width-normalized units; aspect = height / width of the map box. */
export function snapPoint(
    p: MapPoint,
    zones: Polygon[],
    radius: number,
    aspect = 1
): MapPoint {
    let vertex: MapPoint | null = null;

    let vertexDist = radius;

    let edge: MapPoint | null = null;

    let edgeDist = radius;

    for (const poly of zones) {
        poly.forEach((a, i) => {
            const av = { x: a[0], y: a[1] };

            const dv = dist(p, av, aspect);

            if (dv <= vertexDist) {
                vertex = av;
                vertexDist = dv;
            }

            const q = nearestOnSegment(p, a, poly[(i + 1) % poly.length], aspect);

            const de = dist(p, q, aspect);

            if (de <= edgeDist) {
                edge = q;
                edgeDist = de;
            }
        });
    }

    return vertex ?? edge ?? p;
}

export const edgeKey = (a: Pt, b: Pt) => {
    const [s, e] = [a, b].sort((u, v) => u[0] - v[0] || u[1] - v[1]);

    return `${s[0]},${s[1]}|${e[0]},${e[1]}`;
};

export function sharedEdges(zones: Polygon[]): Set<string> {
    const seen = new Set<string>();

    const shared = new Set<string>();

    for (const poly of zones) {
        const own = new Set<string>();

        poly.forEach((a, i) => own.add(edgeKey(a, poly[(i + 1) % poly.length])));

        for (const k of own) {
            if (seen.has(k)) shared.add(k);

            seen.add(k);
        }
    }

    return shared;
}

const ON_EDGE_EPS = 1e-9;

/** Inserts p into a closed ring when it lies strictly inside one of its edges; null when it is a vertex or off the ring. */
export function insertSnapPoint(
    polygon: Polygon,
    p: MapPoint,
    aspect = 1
): { polygon: Polygon; index: number } | null {
    for (let i = 0; i < polygon.length - 1; i++) {
        const a = polygon[i];

        const b = polygon[i + 1];

        if (a[0] === b[0] && a[1] === b[1]) continue;

        if (
            dist(p, { x: a[0], y: a[1] }, aspect) <= ON_EDGE_EPS ||
            dist(p, { x: b[0], y: b[1] }, aspect) <= ON_EDGE_EPS
        )
            return null;

        if (dist(p, nearestOnSegment(p, a, b, aspect), aspect) <= ON_EDGE_EPS) {
            const next: Polygon = [...polygon];

            next.splice(i + 1, 0, [p.x, p.y]);

            return { polygon: next, index: i + 1 };
        }
    }

    return null;
}

/** Neighbour polygons that gain a vertex where a vertex of `ring` lands on their edge; empty when nothing changes. */
export function insertSharedPoints(
    ring: Polygon,
    neighbours: { id: string; polygon: Polygon }[],
    aspect = 1
): { id: string; polygon: Polygon }[] {
    const updated = new Map<string, Polygon>();

    for (const [x, y] of ring.slice(0, -1)) {
        for (const n of neighbours) {
            const hit = insertSnapPoint(
                updated.get(n.id) ?? n.polygon,
                { x, y },
                aspect
            );

            if (hit) updated.set(n.id, hit.polygon);
        }
    }

    return [...updated].map(([id, polygon]) => ({ id, polygon }));
}
