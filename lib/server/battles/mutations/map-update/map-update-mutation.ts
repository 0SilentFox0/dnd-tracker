import { API_ERRORS } from '@/lib/constants/api-errors';
import { MAP_LIMITS } from '@/lib/constants/map-limits';
import { getMap } from '@/lib/server/battle-maps/library-service';
import { cellsOf, isOnMap, isPlayable } from '@/lib/utils/battle/grid';
import {
    composeEffectiveMap,
    pruneRemoved,
} from '@/lib/utils/battle/map-storage/effective-map';
import { MODE_MAP_KEYS } from '@/lib/utils/battle/modes/client';
import type {
    BattleMutationContext,
    MutationResult,
} from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { BattleRuleError } from '@/lib/utils/battle/store';
import { REJECT } from '@/lib/utils/battle/store/reject';
import type { MapUpdateData } from '@/types/api';
import type { BattleMapConfig } from '@/types/battle';

const RUNTIME_KEYS: readonly (keyof BattleMapConfig)[] = [
    'terrain',
    'spellZones',
    'weather',
    'motion',
];

function runtimeFields(map: BattleMapConfig): Partial<BattleMapConfig> {
    const keys: readonly (keyof BattleMapConfig)[] = [
        ...RUNTIME_KEYS,
        ...MODE_MAP_KEYS,
    ];

    return Object.fromEntries(
        keys
            .filter((key) => map[key] !== undefined)
            .map((key) => [key, map[key]])
    );
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

    const header: BattleMapConfig = {
        ...library.map,
        ...runtimeFields(map),
    };

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

    const existing = new Set([...library.walls, ...library.bars]);

    const pruned = pruneRemoved(state, (e) => existing.has(e));

    return {
        ...unchanged,
        scene: {
            map: composeEffectiveMap(header, pruned, library),
            mapRef: { mapId: mapRef.mapId, version: library.version },
            ...(pruned !== state && { mapState: pruned }),
        },
    };
}
