import type { MapPoint, Polygon } from '@/types/world';

type Pt = [number, number];

function nearestOnSegment(p: MapPoint, a: Pt, b: Pt): MapPoint {
    const dx = b[0] - a[0];

    const dy = b[1] - a[1];

    const len2 = dx * dx + dy * dy;

    const t =
        len2 === 0
            ? 0
            : Math.max(
                  0,
                  Math.min(1, ((p.x - a[0]) * dx + (p.y - a[1]) * dy) / len2)
              );

    return { x: a[0] + t * dx, y: a[1] + t * dy };
}

const dist = (p: MapPoint, q: MapPoint) => Math.hypot(p.x - q.x, p.y - q.y);

export function snapPoint(
    p: MapPoint,
    zones: Polygon[],
    radius: number
): MapPoint {
    let vertex: MapPoint | null = null;

    let vertexDist = radius;

    let edge: MapPoint | null = null;

    let edgeDist = radius;

    for (const poly of zones) {
        poly.forEach((a, i) => {
            const av = { x: a[0], y: a[1] };

            const dv = dist(p, av);

            if (dv <= vertexDist) {
                vertex = av;
                vertexDist = dv;
            }

            const q = nearestOnSegment(p, a, poly[(i + 1) % poly.length]);

            const de = dist(p, q);

            if (de <= edgeDist) {
                edge = q;
                edgeDist = de;
            }
        });
    }

    return vertex ?? edge ?? p;
}

const key = (a: Pt, b: Pt) => {
    const [s, e] = [a, b].sort((u, v) => u[0] - v[0] || u[1] - v[1]);

    return `${s[0]},${s[1]}|${e[0]},${e[1]}`;
};

export function sharedEdges(zones: Polygon[]): Set<string> {
    const seen = new Set<string>();

    const shared = new Set<string>();

    for (const poly of zones) {
        const own = new Set<string>();

        poly.forEach((a, i) => own.add(key(a, poly[(i + 1) % poly.length])));

        for (const k of own) {
            if (seen.has(k)) shared.add(k);

            seen.add(k);
        }
    }

    return shared;
}
