import { edgeSegment } from './edge-keys';

import type { GridKind } from '@/types/battle-grid';

function vertexKeys(grid: GridKind, edge: string): string[] {
    return edgeSegment(grid, edge).map(
        (p) => `${Math.round(p.x)},${Math.round(p.y)}`
    );
}

function share(grid: GridKind, a: string, b: string): boolean {
    const va = vertexKeys(grid, a);

    return vertexKeys(grid, b).some((v) => va.includes(v));
}

export function connectedEdgePath(grid: GridKind, sampled: string[]): string[] {
    const out: string[] = [];

    for (const edge of sampled) {
        if (out.includes(edge)) continue;

        while (out.length >= 2 && share(grid, out[out.length - 2], edge))
            out.pop();

        out.push(edge);
    }

    return out;
}
