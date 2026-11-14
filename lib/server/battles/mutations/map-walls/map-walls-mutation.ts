import { API_ERRORS } from '@/lib/constants/api-errors';
import { inBounds, paintEdges, parseEdgeKey } from '@/lib/utils/battle/grid';
import { activeModeWithConfig } from '@/lib/utils/battle/modes';
import type {
    BattleMutationContext,
    MutationResult,
} from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { BattleRuleError } from '@/lib/utils/battle/store';
import { REJECT } from '@/lib/utils/battle/store/reject';
import type { MapWallsData } from '@/types/api';

export function mapWallsMutation(
    ctx: BattleMutationContext,
    body: MapWallsData
): MutationResult {
    const map = ctx.meta.map;

    if (!map)
        throw new BattleRuleError('action_rejected', API_ERRORS.BATTLE_NO_MAP);

    if (activeModeWithConfig(map))
        throw new BattleRuleError('action_rejected', REJECT.mapEdgesInMode);

    const outside = [...body.add, ...body.remove].some((edge) => {
        const { a, b } = parseEdgeKey(edge);

        return !inBounds(map, a) || !inBounds(map, b);
    });

    if (outside)
        throw new BattleRuleError('action_rejected', REJECT.mapOccupied);

    const walls = body.kind === 'walls';

    const added = paintEdges(map, body.add, walls ? 'add-walls' : 'add-bars');

    const existing = new Set((walls ? map.walls : map.bars) ?? []);

    // paintEdges відкидає додавання понад ліміт, не змінюючи карту
    if (added === map && body.add.some((edge) => !existing.has(edge)))
        throw new BattleRuleError('action_rejected', REJECT.mapEdgeLimit);

    const painted = paintEdges(
        added,
        body.remove,
        walls ? 'remove-walls' : 'remove-bars'
    );

    return {
        participants: ctx.participants,
        pending: ctx.pending,
        events: [],
        scene: { map: painted },
    };
}
