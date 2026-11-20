import { distToSegment } from '@/lib/utils/world/geometry';
import type { MapPoint, TrailEntry, TravelKind } from '@/types/world';

const TRAIL_EPS = 0.002;

export interface TrailNode {
    entryId: string;
    x: number;
    y: number;
    kind: TravelKind;
    at: string;
    heroes: { id: string; name: string }[];
}

export interface TrailSegment {
    entryId: string;
    from: MapPoint;
    to: MapPoint;
}

export interface Trail {
    sessionId: string | null;
    nodes: TrailNode[];
    segments: TrailSegment[];
}

export interface TrailRow {
    id: string;
    sessionId: string | null;
    kind: TravelKind;
    characterIds: string[];
    names: Map<string, string>;
    from: MapPoint | null;
    to: MapPoint;
    createdAt: Date;
}

const apart = (a: MapPoint, b: MapPoint, aspect: number) =>
    distToSegment(a, b, b, aspect) > TRAIL_EPS;

export function buildTrails(entries: TrailEntry[], aspect: number): Trail[] {
    const ordered = [...entries].sort(
        (a, b) => Date.parse(a.at) - Date.parse(b.at)
    );

    const trails = new Map<string | null, Trail>();

    for (const e of ordered) {
        let trail = trails.get(e.sessionId);

        if (!trail) {
            trail = { sessionId: e.sessionId, nodes: [], segments: [] };
            trails.set(e.sessionId, trail);
        }

        if (e.kind === 'travel' && e.from && apart(e.from, e.to, aspect))
            trail.segments.push({ entryId: e.id, from: e.from, to: e.to });

        const last = trail.nodes[trail.nodes.length - 1];

        if (last && !apart(last, e.to, aspect)) continue;

        trail.nodes.push({
            entryId: e.id,
            x: e.to.x,
            y: e.to.y,
            kind: e.kind,
            at: e.at,
            heroes: e.heroes,
        });
    }

    return [...trails.values()];
}

export function filterTrailForViewer(
    rows: TrailRow[],
    ownIds: ReadonlySet<string>
): TrailEntry[] {
    const result: TrailEntry[] = [];

    for (const row of rows) {
        const own = row.characterIds.filter((id) => ownIds.has(id));

        if (own.length === 0) continue;

        const all = own.length === row.characterIds.length;

        result.push({
            id: row.id,
            sessionId: row.sessionId,
            kind: row.kind,
            heroes: own.map((id) => ({
                id,
                name: row.names.get(id) ?? '',
            })),
            from: all ? row.from : null,
            to: row.to,
            at: row.createdAt.toISOString(),
        });
    }

    return result;
}
