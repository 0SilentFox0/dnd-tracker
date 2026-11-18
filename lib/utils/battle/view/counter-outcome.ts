import { damageTaken } from './damage-taken';

import { isCounterAction } from '@/lib/utils/battle/action-types';
import type { BattleAction } from '@/types/battle-actions';

export interface CounterOutcome {
    name: string;
    damage: number;
}

export function counterOutcome(
    log: BattleAction[],
    seen: ReadonlySet<number>
): CounterOutcome | undefined {
    const e = log.find(
        (x) => isCounterAction(x.actionType) && !seen.has(x.actionIndex)
    );

    if (!e) return undefined;

    const targetId = e.targets[0]?.participantId;

    const damage = damageTaken(e, targetId);

    return { name: e.actorName, damage };
}
