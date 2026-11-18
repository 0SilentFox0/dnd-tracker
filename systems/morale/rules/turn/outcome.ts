import type { TurnGateOutcome } from '@/lib/utils/battle/flows/turn-flow';
import type { TurnStartCheck } from '@/lib/utils/rules/systems/types';
import { pendingMoraleOf } from '@/systems/morale/rules/state';
import type { MoraleCheckResult } from '@/systems/morale/rules/threshold';

export function moraleOutcome(
    r:
        | Pick<MoraleCheckResult, 'hasExtraTurn' | 'shouldSkipTurn'>
        | null
        | undefined
): TurnGateOutcome {
    return r?.hasExtraTurn ? 'extra' : r?.shouldSkipTurn ? 'skip' : 'none';
}

export const moraleOutcomeOf: TurnStartCheck['outcomeOf'] = (
    sceneState,
    participantId
) => {
    const payload = pendingMoraleOf(sceneState);

    return payload?.participantId === participantId
        ? moraleOutcome(payload.moraleResult)
        : undefined;
};
