import { edgeOnGrid, edgeSegment, type Point } from '@/lib/utils/battle/grid/edge-keys';
import type { GridKind } from '@/types/battle-grid';
import type { MapArtScene } from '@/types/battle-map';

export interface WallRun {
    material: string;
    points: Point[];
    closed: boolean;
}

export type JointKind = 'corner' | 'tee' | 'end' | 'jamb';

export interface WallJoint {
    at: Point;
    material: string;
    kind: JointKind;
}

interface Seg {
    a: string;
    b: string;
    material: string;
}

interface Vertex {
    pt: Point;
    edges: number[];
}

const TURN_EPS = Math.PI / 180;

const vertexKey = (p: Point): string =>
    `${Math.round(p.x * 100)}:${Math.round(p.y * 100)}`;

function turnAt(prev: Point, at: Point, next: Point): number {
    const ax = at.x - prev.x;

    const ay = at.y - prev.y;

    const bx = next.x - at.x;

    const by = next.y - at.y;

    return Math.abs(Math.atan2(ax * by - ay * bx, ax * bx + ay * by));
}

function simplify(points: Point[], closed: boolean): Point[] {
    const n = points.length;

    return points.filter((p, i) => {
        if (!closed && (i === 0 || i === n - 1)) return true;

        return turnAt(points[(i + n - 1) % n], p, points[(i + 1) % n]) > TURN_EPS;
    });
}

export function wallRuns(
    scene: Pick<MapArtScene, 'walls' | 'openings'>,
    grid: GridKind
): { runs: WallRun[]; joints: WallJoint[] } {
    const segs: Seg[] = [];

    const vertices = new Map<string, Vertex>();

    const vert = (key: string): Vertex => {
        const v = vertices.get(key);

        if (!v) throw new Error(`unknown vertex ${key}`);

        return v;
    };

    const jambVertices = new Set<string>();

    const vertexOf = (p: Point): string => {
        const key = vertexKey(p);

        if (!vertices.has(key)) vertices.set(key, { pt: p, edges: [] });

        return key;
    };

    for (const key of Object.keys(scene.walls).sort()) {
        if (!edgeOnGrid(grid, key)) continue;

        const [p, q] = edgeSegment(grid, key);

        if (scene.openings[key]) {
            jambVertices.add(vertexKey(p));
            jambVertices.add(vertexKey(q));

            continue;
        }

        const a = vertexOf(p);

        const b = vertexOf(q);

        const index = segs.push({ a, b, material: scene.walls[key] }) - 1;

        vert(a).edges.push(index);
        vert(b).edges.push(index);
    }

    const other = (seg: Seg, v: string) => (seg.a === v ? seg.b : seg.a);

    const isBreak = (v: string): boolean => {
        const { edges } = vert(v);

        return (
            edges.length !== 2 ||
            segs[edges[0]].material !== segs[edges[1]].material
        );
    };

    const used = new Set<number>();

    const runs: WallRun[] = [];

    const collect = (start: string, first: number, closed: boolean) => {
        const material = segs[first].material;

        const points = [vert(start).pt];

        let seg = first;

        let at = start;

        for (;;) {
            used.add(seg);
            at = other(segs[seg], at);
            points.push(vert(at).pt);

            if (!closed && isBreak(at)) break;

            const { edges } = vert(at);

            seg = edges[0] === seg ? edges[1] : edges[0];

            if (used.has(seg)) break;
        }

        if (closed) points.pop();

        runs.push({ material, points: simplify(points, closed), closed });
    };

    for (const [v, { edges }] of vertices)
        if (isBreak(v))
            for (const e of edges) if (!used.has(e)) collect(v, e, false);

    for (let e = 0; e < segs.length; e++)
        if (!used.has(e)) collect(segs[e].a, e, true);

    const joints: WallJoint[] = [];

    for (const [v, { pt, edges }] of vertices) {
        const first = segs[edges[0]];

        if (edges.length >= 3) joints.push({ at: pt, material: first.material, kind: 'tee' });
        else if (edges.length === 1)
            joints.push({
                at: pt,
                material: first.material,
                kind: jambVertices.has(v) ? 'jamb' : 'end',
            });
        else {
            const second = segs[edges[1]];

            const turn = turnAt(
                vert(other(first, v)).pt,
                pt,
                vert(other(second, v)).pt
            );

            if (turn > TURN_EPS || first.material !== second.material)
                joints.push({ at: pt, material: first.material, kind: 'corner' });
        }
    }

    return { runs, joints };
}
