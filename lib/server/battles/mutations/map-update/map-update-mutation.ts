import { API_ERRORS } from '@/lib/constants/api-errors';
import { textRef } from '@/lib/i18n/text-ref';
import { campaignMapMaxSide } from '@/lib/server/battle-maps/campaign-limits';
import { getMap } from '@/lib/server/battle-maps/library-service';
import { cellsOf, isOnMap, isPlayable } from '@/lib/utils/battle/grid';
import {
    baseDoorsOf,
    composeEffectiveMap,
    pruneRemoved,
} from '@/lib/utils/battle/map-storage/effective-map';
import {
    mergeLibraryHeader,
    pruneOutOfBounds,
} from '@/lib/utils/battle/map-storage/merge-header';
import { withoutEdges } from '@/lib/utils/battle/map-storage/persisted-map';
import type {
    BattleMutationContext,
    MutationResult,
} from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { BattleRuleError } from '@/lib/utils/battle/store';
import { dmEvent } from '@/lib/utils/battle/store/event-mapping';
import { REJECT } from '@/lib/utils/battle/store/reject';
import type { MapUpdateData } from '@/types/api';
import type { BattleMapConfig, BattleMapState } from '@/types/battle';

function pruneState(
    state: BattleMapState | null | undefined,
    keepEdge: (edge: string) => boolean,
    keepDoor: (edge: string) => boolean
) {
    const removed = pruneRemoved(state, keepEdge);

    if (!removed?.doors) return removed;

    const doors = Object.entries(removed.doors).filter(([edge]) =>
        keepDoor(edge)
    );

    return doors.length === Object.keys(removed.doors).length
        ? removed
        : { ...removed, doors: Object.fromEntries(doors) };
}

export async function mapUpdateMutation(
    ctx: BattleMutationContext,
    _body: MapUpdateData
): Promise<MutationResult> {
    const { map, mapRef } = ctx.meta;

    if (!map)
        throw new BattleRuleError('action_rejected', API_ERRORS.BATTLE_NO_MAP);

    if (!mapRef)
        throw new BattleRuleError('action_rejected', REJECT.mapNotLinked);

    const library = await getMap(mapRef.mapId);

    if (!library)
        throw new BattleRuleError(
            'action_rejected',
            API_ERRORS.BATTLE_MAP_NOT_FOUND
        );

    const unchanged: MutationResult = {
        participants: ctx.participants,
        pending: ctx.pending,
        events: [],
    };

    if (library.version === mapRef.version) return unchanged;

    if (
        Math.max(library.cols, library.rows) >
        (await campaignMapMaxSide(library.campaignId))
    )
        throw new BattleRuleError(
            'action_rejected',
            API_ERRORS.BATTLE_MAP_TOO_LARGE
        );

    const pinned = await getMap(mapRef.mapId, mapRef.version);

    const { doors: _effective, ...headerOnly } = withoutEdges(map);

    const baseDoors = baseDoorsOf(map.doors);

    const battleHeader: BattleMapConfig = {
        ...headerOnly,
        ...(baseDoors && { doors: baseDoors }),
    };

    const header = pruneOutOfBounds(
        mergeLibraryHeader(
            (pinned?.map ?? battleHeader) as BattleMapConfig,
            library.map as BattleMapConfig,
            battleHeader
        )
    );

    const stuck = ctx.participants.filter(
        (p) => isOnMap(p) && cellsOf(p).some((c) => !isPlayable(header, c))
    );

    if (stuck.length > 0)
        throw new BattleRuleError(
            'action_rejected',
            REJECT.mapUpdateCollision,
            { names: stuck.map((p) => p.basicInfo.name).join(', ') }
        );

    const state = ctx.meta.mapState;

    const newDoors = header.doors ?? {};

    const existing = new Set([
        ...library.walls,
        ...library.bars,
        ...Object.keys(newDoors),
    ]);

    const pruned = pruneState(
        state,
        (e) => existing.has(e),
        (e) => e in newDoors
    );

    return {
        ...unchanged,
        events: [
            dmEvent(
                ctx.scene.round,
                textRef('battleLog.dm.mapUpdated', { version: library.version })
            ),
        ],
        scene: {
            map: composeEffectiveMap(header, pruned, library),
            mapRef: { mapId: mapRef.mapId, version: library.version },
            ...(pruned !== state && { mapState: pruned }),
        },
    };
}
