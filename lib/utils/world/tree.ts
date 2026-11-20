import type { WorldMapSummary } from '@/types/world';

export function mapPath(
    maps: WorldMapSummary[],
    mapId: string
): WorldMapSummary[] {
    const byId = new Map(maps.map((m) => [m.id, m]));

    const path: WorldMapSummary[] = [];

    const seen = new Set<string>();

    for (
        let cur = byId.get(mapId);
        cur && !seen.has(cur.id);
        cur = cur.parentMapId ? byId.get(cur.parentMapId) : undefined
    ) {
        seen.add(cur.id);
        path.unshift(cur);
    }

    return path;
}

export function subtreeMapIds(
    maps: Pick<WorldMapSummary, 'id' | 'parentMapId'>[],
    rootId: string
): string[] {
    const ids = [rootId];

    const seen = new Set(ids);

    for (let i = 0; i < ids.length; i++) {
        for (const m of maps) {
            if (m.parentMapId === ids[i] && !seen.has(m.id)) {
                seen.add(m.id);
                ids.push(m.id);
            }
        }
    }

    return ids;
}

export const treeDepth = (maps: WorldMapSummary[], id: string): number =>
    mapPath(maps, id).length - 1;

export function treeOrder(maps: WorldMapSummary[]): WorldMapSummary[] {
    const ids = new Set(maps.map((m) => m.id));

    const out: WorldMapSummary[] = [];

    const walk = (parent: string | null) => {
        for (const m of maps) {
            if (
                (m.parentMapId && ids.has(m.parentMapId)
                    ? m.parentMapId
                    : null) === parent &&
                !out.includes(m)
            ) {
                out.push(m);
                walk(m.id);
            }
        }
    };

    walk(null);

    return out;
}
