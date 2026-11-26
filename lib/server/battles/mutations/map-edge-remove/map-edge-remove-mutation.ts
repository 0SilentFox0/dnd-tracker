import { API_ERRORS } from '@/lib/constants/api-errors';
import { textRef } from '@/lib/i18n/text-ref';
import type {
    BattleMutationContext,
    MutationResult,
} from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { BattleRuleError } from '@/lib/utils/battle/store';
import { dmEvent } from '@/lib/utils/battle/store/event-mapping';
import { REJECT } from '@/lib/utils/battle/store/reject';
import type { MapEdgeRemoveData } from '@/types/api';

export function mapEdgeRemoveMutation(
    ctx: BattleMutationContext,
    body: MapEdgeRemoveData
): MutationResult {
    const map = ctx.meta.map;

    if (!map)
        throw new BattleRuleError('action_rejected', API_ERRORS.BATTLE_NO_MAP);

    const state = ctx.meta.mapState ?? { removedEdges: [], doors: {} };

    const edges = new Set(body.edges);

    if (body.restore) {
        const removed = new Set(state.removedEdges);

        if (![...edges].every((e) => removed.has(e)))
            throw new BattleRuleError(
                'action_rejected',
                REJECT.mapEdgeNotRemoved
            );
    } else {
        const present = new Set([
            ...(map.walls ?? []),
            ...(map.bars ?? []),
            ...Object.keys(map.doors ?? {}),
        ]);

        if (![...edges].every((e) => present.has(e)))
            throw new BattleRuleError(
                'action_rejected',
                REJECT.mapEdgeNotFound
            );
    }

    const removedEdges = body.restore
        ? state.removedEdges.filter((e) => !edges.has(e))
        : [...new Set([...state.removedEdges, ...edges])];

    return {
        participants: ctx.participants,
        pending: ctx.pending,
        events: [
            dmEvent(
                ctx.scene.round,
                textRef(
                    body.restore
                        ? 'battleLog.dm.edgesRestored'
                        : 'battleLog.dm.edgesRemoved',
                    { count: edges.size }
                )
            ),
        ],
        scene: { mapState: { ...state, removedEdges } },
    };
}
