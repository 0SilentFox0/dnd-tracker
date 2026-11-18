import { useMemo } from 'react';

import type { BattleSceneValue } from '@/lib/hooks/battle/types';
import type { BattleMapConfig } from '@/types/battle-grid';

export function useMapEdgeSources({
    map,
    battle,
    actions,
}: {
    map: BattleMapConfig | null;
    battle: BattleSceneValue['battle'];
    actions: BattleSceneValue['actions'];
}) {
    const { mutateAsync: mapWalls } = actions.mapWalls;

    const wallsList = map?.walls;

    const barsList = map?.bars;

    const doorsList = map?.doors;

    const edgeSource = useMemo(
        () => ({ walls: wallsList, bars: barsList, mutate: mapWalls }),
        [wallsList, barsList, mapWalls]
    );

    const { mutateAsync: mapEdgeRemove } = actions.mapEdgeRemove;

    const removedList = battle.mapState?.removedEdges;

    const stateEdgeSource = useMemo(
        () => ({
            present: new Set([
                ...(wallsList ?? []),
                ...(barsList ?? []),
                ...Object.keys(doorsList ?? {}),
            ]),
            removed: new Set(removedList),
            mutate: mapEdgeRemove,
        }),
        [wallsList, barsList, doorsList, removedList, mapEdgeRemove]
    );

    return { edgeSource, stateEdgeSource };
}
