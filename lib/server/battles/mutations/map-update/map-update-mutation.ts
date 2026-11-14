import { API_ERRORS } from '@/lib/constants/api-errors';
import { MAP_LIMITS } from '@/lib/constants/map-limits';
import { textRef } from '@/lib/i18n/text-ref';
import { getMap } from '@/lib/server/battle-maps/library-service';
import {
    cellsOf,
    inBounds,
    isOnMap,
    isPlayable,
    parseCellKey,
} from '@/lib/utils/battle/grid';
import { parseEdgeKey } from '@/lib/utils/battle/grid/walls';
import {
    baseDoorsOf,
    composeEffectiveMap,
    pruneRemoved,
} from '@/lib/utils/battle/map-storage/effective-map';
import { mergeLibraryHeader } from '@/lib/utils/battle/map-storage/merge-header';
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

function pruneDoors(map: BattleMapConfig): BattleMapConfig {
    if (!map.doors) return map;

    const entries = Object.entries(map.doors).filter(([edge]) => {
        const { a, b } = parseEdgeKey(edge);

        return inBounds(map, a) && inBounds(map, b);
    });

    return entries.length === Object.keys(map.doors).length
        ? map
        : { ...map, doors: Object.fromEntries(entries) };
}

/** Terrain cells and doors outside the new bounds go, and zones that lose their last cell with them. */
function pruneOutOfBounds(source: BattleMapConfig): BattleMapConfig {
    const map = pruneDoors(source);

    if (!map.terrain) return map;

    const entries = Object.entries(map.terrain);

    const kept = entries.filter(([key]) => inBounds(map, parseCellKey(key)));

    if (kept.length === entries.length) return map;

    const alive = new Set(kept.flatMap(([, cell]) => cell.zoneId ?? []));

    const lost = new Set(
        entries.flatMap(([, cell]) =>
            cell.zoneId && !alive.has(cell.zoneId) ? [cell.zoneId] : []
        )
    );

    const { spellZones } = map;

    return {
        ...map,
        terrain: Object.fromEntries(kept),
        ...(spellZones && {
            spellZones: Object.fromEntries(
                Object.entries(spellZones).filter(([id]) => !lost.has(id))
            ),
        }),
    };
}

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

    if (Math.max(library.cols, library.rows) > MAP_LIMITS.battleMaxSide)
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
