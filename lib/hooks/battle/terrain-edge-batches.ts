import type { TerrainBrushSettings } from './terrain-brush';
import type { EdgeSource, StateEdgeSource } from './useMapTerrainTool';

import { MAP_EDGES_PER_OP } from '@/lib/constants/battle';
import type { MapWallsData } from '@/types/api';

type Shown = { add: string[]; remove: string[] };

export function sendEdgeBatches(
    {
        brush: b,
        edgeSource: src,
        stateEdgeSource: state,
    }: {
        brush: TerrainBrushSettings;
        edgeSource?: EdgeSource;
        stateEdgeSource?: StateEdgeSource;
    },
    { add, remove }: Shown,
    send: (shown: Shown, run: () => Promise<unknown>) => void
) {
    if (b.kind === 'edge-break' || b.kind === 'edge-restore') {
        if (!state) return;

        for (let i = 0; i < remove.length; i += MAP_EDGES_PER_OP) {
            const edges = remove.slice(i, i + MAP_EDGES_PER_OP);

            send({ add: [], remove: edges }, () =>
                state.mutate({
                    edges,
                    ...(b.kind === 'edge-restore' && { restore: true }),
                })
            );
        }

        return;
    }

    if (!src) return;

    const batches = (kind: MapWallsData['kind'], a: string[], r: string[]) => {
        const n = Math.max(a.length, r.length);

        for (let i = 0; i < n; i += MAP_EDGES_PER_OP) {
            const data: MapWallsData = {
                kind,
                add: a.slice(i, i + MAP_EDGES_PER_OP),
                remove: r.slice(i, i + MAP_EDGES_PER_OP),
            };

            send(data, () => src.mutate(data));
        }
    };

    if (b.kind === 'edge-erase') {
        batches('both', [], remove);

        return;
    }

    batches(b.kind === 'edge-wall' ? 'walls' : 'bars', add, remove);
}
