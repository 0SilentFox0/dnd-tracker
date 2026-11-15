import {
    FOG_DEFAULT_VISION_RADIUS,
    FOG_MAX_REVEALED_RUNS,
} from '@/lib/utils/battle/fog/constants';
import {
    addRevealedRuns,
    normalizeRevealedRuns,
    removeRevealedRuns,
} from '@/lib/utils/battle/fog/revealed-runs';
import type {
    BattleMutationContext,
    MutationResult,
} from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { BattleRuleError } from '@/lib/utils/battle/store';
import type { MapFogData } from '@/types/api';
import type { FogState } from '@/types/battle';

export function mapFogMutation(
    ctx: BattleMutationContext,
    body: MapFogData
): MutationResult {
    const map = ctx.meta.map;

    if (!map)
        throw new BattleRuleError('action_rejected', 'battleLog.reject.mapNotLinked');

    if (map.maze)
        throw new BattleRuleError('action_rejected', 'battleLog.reject.mapEdgesInMode');

    const size = { cols: map.cols, rows: map.rows };

    const previous: FogState = ctx.meta.mapState?.fog ?? {
        mode: 'off',
        revealed: [],
        visionRadius: FOG_DEFAULT_VISION_RADIUS,
    };

    for (const run of [...(body.add ?? []), ...(body.remove ?? [])]) {
        const [y, start, end] = run;

        if (y >= map.rows || start >= map.cols || end > map.cols || start >= end)
            throw new BattleRuleError('action_rejected', 'battleLog.reject.mapEdgeOutside');
    }

    const revealed = removeRevealedRuns(
        addRevealedRuns(previous.revealed, body.add ?? [], size),
        body.remove ?? [],
        size
    );

    if (revealed.length > FOG_MAX_REVEALED_RUNS)
        throw new BattleRuleError('action_rejected', 'battleLog.reject.mapEdgeLimit');

    const fog: FogState = {
        mode: body.mode ?? previous.mode,
        visionRadius: body.visionRadius ?? previous.visionRadius,
        revealed: normalizeRevealedRuns(revealed, size),
    };

    const state = ctx.meta.mapState ?? { removedEdges: [], doors: {} };

    if (
        fog.mode === previous.mode &&
        fog.visionRadius === previous.visionRadius &&
        fog.revealed.length === previous.revealed.length &&
        fog.revealed.every((run, index) => run.every((v, i) => v === previous.revealed[index]?.[i]))
    )
        return { participants: ctx.participants, pending: ctx.pending, events: [] };

    return {
        participants: ctx.participants,
        pending: ctx.pending,
        events: [],
        scene: { mapState: { ...state, fog } },
    };
}
