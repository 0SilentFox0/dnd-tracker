import { API_ERRORS } from '@/lib/constants/api-errors';
import { inBounds, paintEdges, parseEdgeKey } from '@/lib/utils/battle/grid';
import {
    baseDoorsOf,
    pruneRemoved,
} from '@/lib/utils/battle/map-storage/effective-map';
import { activeModeWithConfig } from '@/lib/utils/battle/modes';
import type {
    BattleMutationContext,
    MutationResult,
} from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { BattleRuleError } from '@/lib/utils/battle/store';
import { REJECT } from '@/lib/utils/battle/store/reject';
import type { MapWallsData } from '@/types/api';
import type { BattleMapConfig } from '@/types/battle';

export function mapWallsMutation(
    ctx: BattleMutationContext,
    body: MapWallsData
): MutationResult {
    const effective = ctx.meta.map;

    if (!effective)
        throw new BattleRuleError('action_rejected', API_ERRORS.BATTLE_NO_MAP);

    if (ctx.meta.mapRef)
        throw new BattleRuleError('action_rejected', REJECT.mapEdgesLinked);

    if (activeModeWithConfig(effective))
        throw new BattleRuleError('action_rejected', REJECT.mapEdgesInMode);

    const map = withBaseDoors(effective);

    const outside = [...body.add, ...body.remove].some((edge) => {
        const { a, b } = parseEdgeKey(edge);

        return !inBounds(map, a) || !inBounds(map, b);
    });

    if (outside)
        throw new BattleRuleError('action_rejected', REJECT.mapEdgeOutside);

    let painted: BattleMapConfig;

    if (body.kind === 'both') {
        painted = paintEdges(map, body.remove, 'erase').map;
    } else {
        const walls = body.kind === 'walls';

        const added = paintEdges(
            map,
            body.add,
            walls ? 'add-walls' : 'add-bars'
        );

        if (added.overflow)
            throw new BattleRuleError('action_rejected', REJECT.mapEdgeLimit);

        painted = paintEdges(
            added.map,
            body.remove,
            walls ? 'remove-walls' : 'remove-bars'
        ).map;
    }

    const state = ctx.meta.mapState;

    const present = new Set([
        ...(painted.walls ?? []),
        ...(painted.bars ?? []),
    ]);

    const pruned = pruneRemoved(state, (e) => !present.has(e));

    return {
        participants: ctx.participants,
        pending: ctx.pending,
        events: [],
        scene: {
            map: painted,
            ...(pruned !== state && { mapState: pruned }),
        },
    };
}

/** Painting must not copy state-composed doors (open/locked/broken) into the stored base map. */
function withBaseDoors(map: BattleMapConfig): BattleMapConfig {
    const doors = baseDoorsOf(map.doors);

    if (doors === map.doors) return map;

    const { doors: _doors, ...rest } = map;

    return doors ? { ...rest, doors } : rest;
}
