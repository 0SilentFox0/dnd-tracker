import { stampAabb, stampBox } from './stamp-geometry';

import { stampDef } from '@/lib/constants/map-art/stamps';
import { edgeCellsOf, edgeOnGrid } from '@/lib/utils/battle/grid/edge-keys';
import { parseCellKey } from '@/lib/utils/battle/grid/geometry';
import { gridMetrics } from '@/lib/utils/battle/grid/layout';
import { CHUNK_SIDE, chunkKey, parseChunkKey } from '@/lib/utils/battle/map-storage/chunk-key';
import type { GridKind } from '@/types/battle-grid';
import type { MapArtOpening, MapArtScene, MapArtStamp } from '@/types/battle-map';

const sameOpening = (a?: MapArtOpening, b?: MapArtOpening): boolean =>
    a === b ||
    (!!a &&
        !!b &&
        a.kind === b.kind &&
        a.material === b.material &&
        a.locked === b.locked &&
        a.open === b.open);

const sameStamp = (a: MapArtStamp, b: MapArtStamp): boolean =>
    a.asset === b.asset &&
    a.x === b.x &&
    a.y === b.y &&
    a.rot === b.rot &&
    a.scale === b.scale &&
    a.flip === b.flip &&
    a.z === b.z;

function changedKeys<T>(
    prev: Record<string, T>,
    next: Record<string, T>,
    same: (a?: T, b?: T) => boolean = (a, b) => a === b
): string[] {
    const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);

    return [...keys].filter((k) => !same(prev[k], next[k]));
}

export function dirtyChunks(
    prev: MapArtScene | null,
    next: MapArtScene,
    grid: GridKind
): Set<string> | 'all' {
    if (!prev || prev.lights !== next.lights || prev.ambient !== next.ambient)
        return 'all';

    const dirty = new Set<string>();

    const addAround = (cx: number, cy: number) => {
        for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++)
                if (cx + dx >= 0 && cy + dy >= 0) dirty.add(chunkKey(cx + dx, cy + dy));
    };

    const addCell = (x: number, y: number) =>
        addAround(Math.floor(x / CHUNK_SIDE), Math.floor(y / CHUNK_SIDE));

    for (const key of changedKeys(prev.floors, next.floors)) {
        const c = parseChunkKey(key);

        if (c) addAround(c.cx, c.cy);
    }

    const edges = new Set([
        ...changedKeys(prev.walls, next.walls),
        ...changedKeys(prev.openings, next.openings, sameOpening),
    ]);

    for (const key of edges) {
        if (!edgeOnGrid(grid, key)) continue;

        for (const c of edgeCellsOf(grid, key)) addCell(c.x, c.y);
    }

    for (const key of changedKeys(prev.blocked, next.blocked)) {
        const c = parseCellKey(key);

        addCell(c.x, c.y);
    }

    if (prev.stamps !== next.stamps) {
        const { colStep, rowStep } = gridMetrics(grid);

        const addStamp = (s: MapArtStamp) => {
            const def = stampDef(s.asset);

            const a = stampAabb(stampBox(s, def ?? { cols: 1, rows: 1 }));

            const c0 = Math.floor(a.x0 / colStep / CHUNK_SIDE);
            const c1 = Math.floor(a.x1 / colStep / CHUNK_SIDE);
            const r0 = Math.floor(a.y0 / rowStep / CHUNK_SIDE);
            const r1 = Math.floor(a.y1 / rowStep / CHUNK_SIDE);

            for (let cy = r0; cy <= r1; cy++)
                for (let cx = c0; cx <= c1; cx++) addAround(cx, cy);
        };

        const before = new Map(prev.stamps.map((s) => [s.id, s]));

        const after = new Map(next.stamps.map((s) => [s.id, s]));

        for (const id of new Set([...before.keys(), ...after.keys()])) {
            const a = before.get(id);

            const b = after.get(id);

            if (a && b && sameStamp(a, b)) continue;

            if (a) addStamp(a);

            if (b) addStamp(b);
        }
    }

    return dirty;
}
